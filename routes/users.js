const config = require('config');
const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {User, validateUser, validateUserUpdate} = require('../models/user');
const {Visitor} = require('../models/visitor');
const {City} = require('../models/city');
const {Item} = require('../models/item');
const {validateShipping} = require('../models/shipping');
const {validateCreditCard} = require('../models/creditCard');
const {validateCart} = require('../models/cart');
const {sendMail} = require('../services/mail');
const multer  = require('multer');
const { Company } = require('../models/company');
const payGW = require('../services/epayco')
const upload = multer({ dest: config.get('tempResources') });
const router = express.Router();

const profilePictureFolder = 'profilePictures/';


const getInfoUserToken = async (req, res) => {
    if (req.user.isVisitor) {
        const userInfo = await Visitor.findById(req.user._id).select('-ip -status -access.isAdmin');
        res.send(userInfo);
    } else {
        const userInfo = await User.findById(req.user._id).select('-access.password -cart -followers -following -access.ip -access._id -access.isAdmin -status -contact._id -paymentProviderId');
        if (!userInfo) return res.status(404).send({ message: 'The user with the given ID was not found.' });
        res.send(userInfo);
    }
}

const getCart = async (req, res) => {
    var cart = [];
    if (req.user.isVisitor){
        const visitorInfo = await Visitor.findById(req.user._id).select('cart');
        if (visitorInfo) cart = visitorInfo.cart;
    } else {
        const userInfo = await User.findById(req.user._id).select('cart');
        if (!userInfo) return res.status(404).send({ message: 'The user with the given ID was not found.' });
        cart = userInfo.cart;
    }
    res.send(cart);
}

const getCartByCompany = async (req, res) => {
    var cart = [];
    if (req.user.isVisitor){
        const visitorInfo = await Visitor.findById(req.user._id).select('cart');
        if (visitorInfo) cart = visitorInfo.cart;
    } else {
        const userInfo = await User.findById(req.user._id).select('cart');
        if (!userInfo) return res.status(404).send({ message: 'The user with the given ID was not found.' });
        cart = userInfo.cart;
    }

    var dataCompanies = {}, dataItems = {}, data = [];
    for (let x in cart){
        let item = cart[x];

        if (!dataCompanies[item.item.company._id]) {
            dataCompanies[item.item.company._id] = { 
                id: item.item.company.id,
                name: item.item.company.name,
                logo: item.item.company.logo.find(x => x.size === 'xs') || item.item.company.logo[0]
            };
        }

        if (!dataItems[item.item.company._id]) dataItems[item.item.company._id] = [];
        dataItems[item.item.company._id].push({ 
            id: item._id,
            itemId: item.item._id,
            type: item.item.type,
            title: item.item.title,
            price: item.price,
            quantity: item.quantity,
            total: item.price*item.quantity,
            profilePicture: item.item.profilePicture.find(x => x.size === 'md') || item.item.profilePicture[0],
            selectableFields: item.selectableFields
        });
    }

    for (let y in dataCompanies){
        data.push({
            'company': dataCompanies[y],
            'items': dataItems[y]
        })
    }

    res.send(data);
}

/**
 * Get the companies of the current user
 * @param {object} req 
 * @param {object} res 
 */
const getUserCompanies = async (req, res) => {
    if (req.user.isVisitor) return res.status(404).send({ message: 'The user with the given ID does not have companies.' });

    const companies = await Company.find({ owner: req.user._id }).select('_id, name slogan logo coverPicture description location contact');
    res.send(companies);
}

const getUserCreditCard = async(req, res) => {
    if (req.user.isVisitor) return res.status(404).send({ message: 'The user with the given ID does not have credit cards.' });

    const user = await User.findById(req.user._id);
    return res.send(user.creditCards);
}

const validatePasswordToken = async (req, res) => {
    const token = req.body.token;
    if (!token) return res.status(400).send({ message: 'Token is required' });

    const isValid = await validateTokenExpiration(token, req.body.email);
    res.send({ "isValid": isValid });
}

const createUser = async (req, res) => {

    const { error } = validateUser(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });

    let user = await User.findOne({ 'access.email': req.body.email });
    if (user) return res.status(400).send({ message: 'User already registered' });

    user = new User({
        firstName: req.body['firstName'],
        lastName: req.body['lastName'],
        profilePicture: config.get('images.defaultProfilePicture'),
        access: {
            email: req.body['email'],
            ip: req.connection.remoteAddress,
            isAdmin: false
        },
        contact: {
            phoneNumber: req.body['phoneNumber']
        },
        status: 'pending',
        shipping: [],
        cart: [],
        followers: [],
        following: [] 
    });
    
    const salt = await bcrypt.genSalt(10);
    user.access.password = await bcrypt.hash(req.body['password'], salt);
    await user.save();

    fs.readFile('resources/htmlTemplates/emailConfirmation.html', async function(error, data){
        if (error){
            return res.status(400).send({ message: "Email was not sent but the user was created." });
        }

        const responseMail = await sendConfirmationEmail(user, data);
    
        if (responseMail.error)
            return res.status(400).send({ message: responseMail.message });
        else
            return res.send({ message: 'Email sent for verification' }); 
    });
}

const resendEmailConfirmation = async (req, res) => {

    const email = req.body.email;
    if (!email) return res.status(400).send({ message: 'Email is required' });
    
    const user = await User.findOne({ 'access.email': email, status: 'pending' });
    if (!user) return res.status(400).send({ message: 'Email is already verified' });

    fs.readFile('resources/htmlTemplates/emailConfirmation.html', async function(error, data){
        if (error){
            return res.status(400).send({ message: "Email was not sent but the user was created." });
        }

        const responseMail = await sendConfirmationEmail(user, data);
        if (responseMail.error)
            return res.status(400).send({ message: responseMail.message });
        else
            return res.send({ message: 'Email sent for verification' }); 
    });
    
}

const confirmEmail = async (req, res) => {

    const jwt = require('jsonwebtoken');
    const config = require('config');

    const token = req.body.token;
    if (!token) return res.status(400).send({ message: 'Token is required' });

    try{
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
        const userInfo = decoded;

        const user = await User.findById(userInfo._id).select('-access.password');
        if (!user) return res.status(404).send({ message: 'The user with the given ID was not found.' });

        user.status = 'active';
        user.save();

        return res.send({ 
            token: token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture
            }
        });
    }
    catch (ex){
        res.status(400).send({ message: 'Invalid token' });
    }  
}

const updatePassword = async (req, res) => {
    const password = req.body.password;
    if (!password) return res.status(400).send({ message: 'Password is required' });

    let user = await User.findById(req.user._id);
    if (!user) return res.status(404).send({ message: 'The user with the given ID was not found' });

    const salt = await bcrypt.genSalt(10);
    user.access.password = await bcrypt.hash(req.body.password, salt);

    await user.save();
    return res.send({ status: 'success' });
}

/**
 * Current user follows an account
 * @param {object} req 
 * @param {object} res 
 */
const follow = async (req, res) => {
    if (req.body.company){
        let company = await Company.findById(req.body.company);
        if (!company) return res.status(404).send({ message: 'The company with the given ID was not found' });
        if (!company.followers[req.user._id]){
            company.followers.push(req.user._id);
            await company.save();
            await User.update({ _id: req.user._id }, { $push: { following: company._id } });
            return res.send({ message: 'success' });
        }
    }
    return res.status(400).send({ message: 'Command is not valid.' });
}

/**
 * Current user unfollows an account
 * @param {object} req 
 * @param {object} res 
 */
const unfollow = async (req, res) => {
    if (req.body.company){
        await Company.update({ _id: req.body.company }, { $pull: { followers: req.user._id } })
        await User.update({ _id: req.user._id }, { $pull: { following: req.body.company } });
        return res.send({ message: 'success' });
    }
    return res.status(400).send({ message: 'Command is not valid.' });
}

const addUserShipping = async (req, res) => {
    const { error } = validateShipping(req.body); 
    if (error) return res.status(400).send(error.details[0].message);
    
    const city = await City.findById(req.body.city);
    if (!city) return res.status(400).send({ message: 'Invalid city.' });

    var responseData;
    const data = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        neighborhood: req.body.neighborhood,
        city: {
            _id: city._id,
            name: city.name,
            stateId: city.stateId,
            stateName: city.stateName,
            countryId: city.countryId,
            countryName: city.countryName 
        },
        notes: req.body.notes
    };
    if (req.body.long && req.body.lat) data.coordinates = [req.body.long, req.body.lat];

    if (req.user.isVisitor){
        var visitor = await Visitor.findById(req.user._id);
        if (visitor){
            visitor.shipping.push(data);
            await visitor.save();
            responseData = visitor.shipping;
        } else {
            var newVisitor = new Visitor({
                _id: req.user._id,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                contact: { phoneNumber: req.body.phone },
                ip: req.connection.remoteAddress,
                status: 'active',
                shipping: [data],
                cart: []
            });
            await newVisitor.save();
            responseData = newVisitor.shipping;
        }
    } else {
        let user = await User.findById(req.user._id);
        if (!user) return res.status(404).send({ message: 'The user with the given ID was not found' });
        user.shipping.push(data);
        await user.save();
        responseData = user.shipping;
    }
    
    return res.send(responseData);
}

const addUserCreditCard = async (req, res) => {
    const {error} = validateCreditCard(req.body);
    if (error) return res.status(400).send({ message: error.details[0].message });

    const b = req.body;
    let user = await User.findById(req.user._id);

    // Create credit card in payment gateway
    const respCC = await payGW.createCreditCard({
        number: b.number,
        expMonth: b.expMonth.toString(),
        expYear: b.expYear.toString(),
        cvc: b.cvc
    });

    if (!(respCC.id && respCC.id !== '')){
        return res.status(400).send({ message: 'Payment credit card registration failed' });
    }
    const idCreditCard = respCC.id;

    // Create user in payment gateway
    if (!user.paymentProviderId || user.paymentProviderId === ''){
        const respCustomer = await payGW.createCustomer({
            tokenCard: idCreditCard,
            firsName: b.name,
            lastName: b.name, 
            email: user.access.email,
            default: true,
            phone: user.contact.phoneNumber
        });
        if (!(respCustomer.data && respCustomer.data.customerId)){
            return res.status(500).send({ message: 'Payment customer registration failed.' });
        }

        user.paymentProviderId = respCustomer.data.customerId;
        
    } else {
        await payGW.addTokenToCustomer(idCreditCard, user.paymentProviderId);
    }
    
    // Create credit card
    const newRecord = {
        tokenId: idCreditCard,
        mask: respCC.card.mask,
        ownerName: b.name,
        franchise: respCC.card.name
    };
    user.creditCards.push(newRecord);

    await user.save();
    return res.send(user.creditCards);
}

const addItemCart = async (req, res) => {
    const { error } = validateCart(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
    
    const item = await Item.findById(req.body.item)
        .select('-media -inventory -reviews -company.slogan -company.coverPicture -company.createdAt -company.media -company.reviews -company.followers -company.following -company.stats');
    if (!item) return res.status(400).send({ message: 'Invalid item.' });

    const r = req.body;
    const itemCart = {
        item: item,
        quantity: r.quantity,
        price: r.price,
        createdAt: new Date()
    };

    if (r.selectableFieldId) {
        itemCart['selectableFields'] = {
            _id: r.selectableFieldId,
            fields: r.selectableFields,
        };
    }

    if (req.user.isVisitor){
        // ---------------- Visitor User

        let visitor = await Visitor.findById(req.user._id);
        if (visitor){

            let cartItemExists;
            if (r.selectableFieldId){
                let items = visitor.cart.filter(x => x['item']['id'] === r.item);
                if (items) {
                    cartItemExists = items.find(y => y['selectableFields']['_id'] === r.selectableFieldId );
                }
            } else {
                cartItemExists = visitor.cart.find(x => x['item']['id'] === r.item);
            }

            if (cartItemExists){
                cartItemExists.quantity = cartItemExists.quantity + r.quantity;
            } else {
                visitor.cart.push(itemCart);
            }
            await visitor.save();
            return res.send(visitor.cart);

        } else {
            let newVisitor = new Visitor({
                _id: req.user._id,
                ip: req.connection.remoteAddress,
                status: 'active',
                shipping: [],
                cart: [itemCart]
            });
            await newVisitor.save();
            return res.send(newVisitor.cart);
        }

    } else {
        // ------------- Registered User

        let user = await User.findById(req.user._id);
        if (!user) return res.status(400).send({ message: 'Invalid user.' });

        let cartItemExists;
        if (r.selectableFieldId){
            let items = user.cart.filter(x => x['item']['id'] === r.item);
            if (items) {
                cartItemExists = items.find(y => y['selectableFields']['_id'] === r.selectableFieldId );
            }
        } else {
            cartItemExists = user.cart.find(x => x['item']['id'] === r.item);
        }
        
        if (cartItemExists){
            cartItemExists.quantity = cartItemExists.quantity + r.quantity;
        } else {
            user.cart.push(itemCart);
        }
        await user.save();
        return res.send(user.cart);
    }
}

const updateUserShipping = async (req, res) => {
    const { error } = validateShipping(req.body); 
    if (error) return res.status(400).send(error.details[0].message);
    
    const city = await City.findById(req.body.city);
    if (!city) return res.status(400).send({ message: 'Invalid city.' });

    var responseData;
    const data = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        neighborhood: req.body.neighborhood,
        city: {
            _id: city._id,
            name: city.name,
            stateId: city.stateId,
            stateName: city.stateName,
            countryId: city.countryId,
            countryName: city.countryName 
        },
        notes: req.body.notes
    };
    if (req.body.long && req.body.lat) data.coordinates = [req.body.long, req.body.lat];

    if (req.user.isVisitor){
        var visitor = await Visitor.findOneAndUpdate(
            {_id: req.user._id, 'shipping._id': req.params.id},
            { '$set': { 'shipping.$': data } }
        );
        responseData = visitor.shipping; 
    } else {
        let user = await User.findOneAndUpdate(
            { _id: req.user._id, 'shipping._id': req.params.id },
            { '$set': { 'shipping.$': data } },
            { new: true }
        );
        responseData = user.shipping;
    }
    
    return res.send(responseData);
}

const deleteUserShipping = async (req, res) => {
    if (req.user.isVisitor){
        await Visitor.updateOne({ _id: req.user._id }, { $pull: { shipping: { _id: req.params.shippingId }}});
    } else {
        await User.updateOne({ _id: req.user._id }, { $pull: { shipping: { _id: req.params.shippingId }}});
    }
    return res.send({ status: 'success' });
}

const deleteUserCreditCard = async (req, res) => {

    const user = await User.findOne(
        {'creditCards._id': req.params.id}, 
        {'creditCards.$': true, paymentProviderId: true}
    );
    const ccData = user.creditCards[0];
    const resp = await payGW.deleteCreditCard(ccData.franchise, ccData.mask, user.paymentProviderId);
    if (resp.status === true){
        await User.updateOne({ _id: req.user._id }, { $pull: { creditCards: { _id: req.params.id }}});
    }
    
    return res.send({ status: 'success' });
}

const deleteItemCart = async (req, res) => {
    if (req.user.isVisitor){
        await Visitor.updateOne({ _id: req.user._id }, { $pull: { cart: { _id: req.params.recordId }}});
    } else {
        await User.updateOne({ _id: req.user._id }, { $pull: { cart: { _id: req.params.recordId }}});
    }
    return res.send({ status: 'success' });
}

const updateUser = async (req, res) => {

    if (req.user.isVisitor) return res.status(404).send({ message: 'Visitors cannot update information.' });

    const { error } = validateUserUpdate(req.body); 
    if (error) return res.status(400).send(error.details[0].message);

    const data = req.body;

    if (data['email']){
        const emailExists = await User.findOne({ _id: { $ne: req.user._id }, 'access.email': data['email'] });
        if (emailExists) return res.status(400).send({ message: 'The email given is taken' });
    }

    const user = await User.findOne({ '_id': req.user._id });
    const validPassword = await bcrypt.compare(data.validation, user.access.password);
    if (!validPassword) return res.status(400).send({ message: 'Invalid password' });
    
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.phoneNumber) user.contact.phoneNumber = data.phoneNumber;
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        user.access.password = await bcrypt.hash(data.password, salt);
    }
    console.log('user', user);
    await user.save();

    if (!user) return res.status(404).send('The user with the given ID was not found.');
    res.send({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.access.email,
        phoneNumber: user.contact.phoneNumber
    });
}

const updateProfilePicture = async (req, res) => {

    const FileHandling = require('../services/fileHandling');
    
    if(!req.file) return res.status(400).send({ message: 'No file uploaded' });
    
    const fileHandling = new FileHandling(req.file);
    const fileName = new Date().getTime();
    const uploadResponse = await fileHandling.saveFile(profilePictureFolder, fileName, ['image/png','image/jpg','image/jpeg'], []);

    let user = await User.findByIdAndUpdate(req.user._id, { profilePicture: uploadResponse[0].url });
    if (user)
        res.send({ profilePicture: uploadResponse[0].url });
    else
        res.status(404).send({ message: 'The user with the given ID was not found' })
}

const updateItemCart = async (req, res) => {
    if (!req.body.quantity) return res.status(400).send({ message: 'Quantity cannot be empty' });
    
    if (req.user.isVisitor){
        await Visitor.updateOne(
            { _id: req.user._id, 'cart._id': req.params.recordId }, 
            { $set: { 'cart.quantity.$': req.body.quantity }}
        );
        
    } else {
        await User.updateOne(
            { _id: req.user._id, 'cart._id': req.params.recordId }, 
            { $set: { 'cart.$.quantity': req.body.quantity }}
        );
    }
    res.send({ status: 'success' });
}

// ---------- Functions -----------

/**
 * Send account confirmation email
 * @param {User} user 
 */
async function sendConfirmationEmail(user, data){

    const isVisitor = false;
    const tokenExpires = true;
    const token = user.generateAuthToken(isVisitor, tokenExpires);
    const urlToken = `${config.get('appURL')}user/confirmation/${token}`;
    var mailText = data.toString();
    mailText = mailText.replace('{LOGO_IMAGE}', config.get('images.logo'));
    mailText = mailText.replace('{MAIL_IMAGE}', config.get('images.mail'));
    mailText = mailText.replace('{URL_TOKEN}', urlToken);
    mailText = mailText.replace('{APP_URL}', config.get('appURL'));

    return await sendMail({
        from: config.get('email.from'),
        to: user.access.email,
        subject: '¡Estás a un solo paso! Confirma tu correo electrónico',
        html: mailText
    });
}

router.get('/me', auth, asyncMiddleware(getInfoUserToken));
router.get('/me/companies', auth, getUserCompanies);
router.get('/me/creditCard', auth, getUserCreditCard);
router.get('/cart', auth, getCart);
router.get('/cartByCompany', auth, getCartByCompany);
router.post('/passwordToken/isValid', asyncMiddleware(validatePasswordToken));
router.post('/', createUser);
router.post('/resendConfirmation', auth, asyncMiddleware(resendEmailConfirmation));
router.post('/confirmation', asyncMiddleware(confirmEmail));
router.post('/me/password', auth, updatePassword);
router.post('/me/shipping', auth, addUserShipping);
router.post('/me/creditCard', auth, addUserCreditCard);
router.post('/me/follow', auth, follow);
router.post('/me/unfollow', auth, unfollow);
router.post('/cart', auth, addItemCart);
router.put('/me', auth, asyncMiddleware(updateUser));
router.put('/me/profilePicture', [auth, upload.single('file')], updateProfilePicture);
router.put('/me/shipping/:id', auth, updateUserShipping);
router.put('/me/cart/:recordId', auth, updateItemCart);
router.delete('/me/shipping/:shippingId', auth, deleteUserShipping);
router.delete('/me/creditCard/:id', auth, deleteUserCreditCard);
router.delete('/me/cart/:recordId', auth, deleteItemCart);

module.exports = router;