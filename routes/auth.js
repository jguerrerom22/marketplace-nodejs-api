const Joi = require('joi');
const config = require('config');
const bcrypt = require('bcrypt');
const express = require('express');
const fetch = require('node-fetch');
//const logging = require('../startup/logging');
const {User} = require('../models/user');
const {Company} = require('../models/company');
const googleAuth = require('../services/googleAuth');
const facebookAuth = require('../services/facebookAuth');
const {sendMail} = require('../services/mail');
const router = express.Router();

/**
 * Authentication by email and password
 * @param {object} req 
 * @param {object} res 
 */
const authenticate = async (req, res) => {
    const { error } = validate(req.body); 
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({ 'access.email': req.body.email });
    
    if (!user) return res.status(400).send('Invalid email or password');
    if (user.status !== 'active') return res.status(400).send('The user is not active');
    
    const validPassword = await bcrypt.compare(req.body.password, user.access.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const userCompanies = await Company.find({ owner: user._id }).select('_id name logo')

    const token = user.generateAuthToken();
    return res.send({ 
        token: token,
        user: {
            id: user._id,
            status: user.status,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.access.email,
            profilePicture: user.profilePicture,
            companies: userCompanies.map((x) => ({ id: x._id, name: x.name, logo: x.logo[0].url }))
        }
    });
};

/**
 * Authentication by Google
 * @param {object} req 
 * @param {object} res 
 */
const authenticateGoogle = async (req, res) => {
    if (!req.body.token) return res.status(400).send({ message: 'Invalid token' });

    try {
        googleAuth.getGoogleUser(req.body.token)
            .then(async(r) => {
                if (r.error == true){
                    return res.status(400).send({ message: r.message });
                } else {
                    let userData = {
                        socialId: 'go-' + r.id,
                        firstName: r.firstName,
                        lastName: r.lastName,
                        profilePicture: r.pic,
                        access: {
                            email: r.email,
                            ip: req.ip
                        },
                        status: 'active'    
                    };
                    return await returnSocialAuthentication(userData);
                }
            })
            .then( credentials => {
                res.setHeader( 'Content-Type', 'application/json' );
                res.end(JSON.stringify(credentials));
            } )
            .catch(e => {
                const err = new Error('Error user validation');
                console.error(err.message, err);
                //throw new Error(e)
            })

    } catch (error) {
        res.sendStatus(500).end(JSON.stringify({ error: "Internal server error" }))
        return console.error(error)
    }
}

/**
 * Authentication by Facebook
 * @param {object} req 
 * @param {object} res 
 */
const authenticateFacebook = async (req, res) => {
    if (!req.body.token) return res.status(400).send({ message: 'Invalid token' });

    try {
        facebookAuth.getFacebookUser(req.body.token)
            .then(async(r) => {
                //console.log(r);
                if (r.error){
                    return res.status(400).send({ message: r.message });
                } else {
                    let userData = {
                        socialId: 'fb-' + r.id,
                        firstName: r.firstName,
                        lastName: r.lastName,
                        profilePicture: r.profilePicture,
                        access: {
                            email: r.email,
                            ip: req.ip
                        },
                        status: 'active'    
                    };
                    return await returnSocialAuthentication(userData);
                }
            })
            .then(credentials => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify( credentials));
            } )
            .catch(e => {
                const err = new Error('Error user validation');
                console.error(err.message, err);
                //throw new Error(e)
            })

    } catch (error) {
        res.sendStatus(500).end(JSON.stringify({ error: "Internal server error" }))
        return console.error(error)
    }
}

/**
 * Authenticate as visitor
 * @param {object} req 
 * @param {object} res 
 */
const authenticateVisitor = async (req, res) => {
    const { error } = validateVisitor(req.body); 
    if (error) return res.status(400).send(error.details[0].message);

    const isVisitor = true;
    const token = User({ _id: req.body.id, access: { isAdmin: false } }).generateAuthToken(isVisitor);
    res.send({ token: token });
}

/**
 * Send email for reset password
 * @param {object} req 
 * @param {object} res 
 */
const forgotPassword = async (req, res) => {
    
    const fs = require('fs');

    if (!req.body.token) return res.status(400).send({ message: 'Token is required' });
    if (!req.body.email) return res.status(400).send({ message: 'Email is required' });

    var user = await User.findOne({ 'access.email': req.body.email });
    if (!user) return res.status(404).send({ message: 'The user with the given email was not found' });

    const token = req.body.token;
    return fetch(config.get('google.reCAPTCHA.apiUrl'), { 
        method: 'POST',
        body: {
            secret: config.get('google.reCAPTCHA.secretKey'),
            response: token,
            remoteip: req.connection.remoteAddress
        }
    })
    .then(response => response.json() )
    .then(async(response) => {        
        if (response.success == false){

            fs.readFile('resources/htmlTemplates/resetPassword.html', async function(error, data){
                if (error){
                    return res.status(400).send({ message: "Email was not sent because template is no avaiable." });
                }

                const token = user.generateAuthToken(true);
                const urlToken = `${config.get('appURL')}user/resetPassword/${token}`;
                var mailText = data.toString();
                mailText = mailText.replace('{LOGO_IMAGE}', config.get('images.logo'));
                mailText = mailText.replace('{PASSWORD_IMAGE}', config.get('images.password'));
                mailText = mailText.replace('{URL_TOKEN}', urlToken);
                mailText = mailText.replace('{APP_URL}', config.get('appURL'));

                const responseMail = await sendMail({
                    from: config.get('email.from'),
                    to: req.body['email'],
                    subject: 'Reestablece tu contraseña en kuvid',
                    html: mailText
                });
            
                if (responseMail.error)
                    return res.status(400).send({ message: responseMail.message });
                else
                    return res.send({ message: 'Email was sent' }); 
            });
        } else {
            return res.status(400).send({ message: 'Invalid token.' });
        }
    })
    .catch( err => {
        console.log(err.message);
        return res.status(400).send({ message: 'Email was not sent.' });
    });
}

// ----------- Functions ---------

/**
 * Data validation
 * @param {object} req 
 */
function validate(req){
    const schema = {
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(1024).required()
    };
    return Joi.validate(req, schema);
}

/**
 * Data validation for visitor
 * @param {object} req 
 */
function validateVisitor(req){
    const schema = {
        id: Joi.string().min(5).max(255).required()
    };

    return Joi.validate(req, schema);
}

/**
 * Get the info of the logged in user by social media
 * @param {object} userData 
 */
async function returnSocialAuthentication(userData){
    var user = await User.findOne({ 'access.email': userData.access.email });
    
    if (!user){
        user = new User(userData);
        await user.save();
    } else {
        if (user.status !== 'active') return res.status(400).send('The user is not active');

        user = await User.findByIdAndUpdate(user._id, userData);
    }
    return {
        token: user.generateAuthToken(),
        user: {
            id: user._id,
            status: user.status,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.access.email,
            profilePicture: userData.profilePicture
        }
    }
}

router.post('/', authenticate);
router.post('/google', authenticateGoogle);
router.post('/facebook', authenticateFacebook);
router.post('/visitor', authenticateVisitor);
router.post('/forgotPassword', forgotPassword);

module.exports = router;