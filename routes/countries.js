const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {Country, validateCountry, validateState} = require('../models/country');
const express = require('express');
const router = express.Router();

const createCountry = async (req, res) => {
    const { error } = validateCountry(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const r = req.body;
    
    const country = new Country({
        name: r.name,
        code: r.code,
        currency: r.currency,
        currencySymbol: r.currencySymbol
    });

    for (let x in r.states){
        country.states.push({
            name: r.states[x].name
        })
    }

    await country.save();
    return res.send(country);
}

const updateCountry = async (req, res) => {
    const { error } = validateCountry(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const r = req.body;
    const country = await Country.findByIdAndUpdate(req.params.id, { 
        name: r.name,
        code: r.code,
        currency: r.currency,
        currencySymbol: r.currencySymbol
    }, {
        new: true
    });

    if (!country) return res.status(404).send('The country with the given ID was not found.');
    
    return res.send(country);
}

router.post('/', auth, createCountry);
router.put('/:id', auth, updateCountry);

module.exports = router;