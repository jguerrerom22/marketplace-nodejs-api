const fetch = require('node-fetch');
const express = require('express');
const config = require('config');
const asyncMiddleware = require('../../middleware/async');
const {CampaignCallToAction, validateRecord} = require('../../models/campaigns/callToAction');
const router = express.Router();

const createCallToAction = async (req, res) => {
    const { error } = validateRecord(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
    
    let record = await CampaignCallToAction.findOne({ email: req.body.email });
    if (record) return res.status(400).send({ message: 'Record already registered' });

    const r = req.body;
    const created = new Date();
    const token = r.token;

    let urlReCaptcha = config.get('google.reCAPTCHA.apiUrl');
    urlReCaptcha += '?secret=' + config.get('google.reCAPTCHA.secretKey');
    urlReCaptcha += '&response=' + token;

    return fetch(urlReCaptcha, { method: 'POST' })
    .then(response => response.json() )
    .then(async(response) => {        
        if (response.success){
            
            record = new CampaignCallToAction({
                name: r.name,
                email: r.email,
                city: r.city,
                ip: req.connection.remoteAddress,
                createdAt: created,
            });
        
            await record.save();
            return res.send({
                id: record._id,
                name: record.name,
                city: record.city,
                email: record.email
            });
        } else {
            return res.status(400).send({ message: 'Invalid token.' });
        }
    })
    .catch( err => {
        console.log(err.message);
        return res.status(400).send({ message: 'Record was not saved.' });
    });
}

router.post('/', asyncMiddleware(createCallToAction));

module.exports = router;