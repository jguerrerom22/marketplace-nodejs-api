const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {Country} = require('../models/country');
const {City, validateCity} = require('../models/city');
const express = require('express');
const router = express.Router();

const getAllCities = async (req, res) => {
    const sortBy = req.query.sortBy ? req.query.sortBy : 'name';
    
    // Filters
    let filters = {};
    if (req.query.state) filters['stateId'] = req.query.state;
    if (req.query.country) filters['countryId'] = req.query.country;

    const cities = await City.find(filters).sort(sortBy).select('_id name stateName countryName');
    return res.send(cities);
}

const getAllStatesCountry = async (req, res) => {
    const sortBy = req.query.sortBy ? req.query.sortBy : 'name';
    const states = await Country.findById(req.params.country, { states: 1, _id: 0 }).sort(sortBy);
    return res.send(states.states);
}

const getOneCity = async (req, res) => {
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).send({ message: 'The city with the given ID was not found.' });
    return res.send(city);
}

const createCity = async (req, res) => {
    const { error } = validateCity(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
    
    const country = await Country.findOne({ 'states._id': req.body.state }, { _id: 1, name: 1, 'states.$': 1})
    if (!country) return res.status(404).send({ message: 'The state with the given ID was not found.' });
    const r = req.body;
    
    const city = new City({
        name: r.name,
        stateId: country.states[0]._id,
        stateName: country.states[0].name,
        countryId: country._id,
        countryName: country.name
    });

    await city.save();
    return res.send(city);
}

const updateCity = async (req, res) => {
    const { error } = validateCountry(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const r = req.body;
    const city = await City.findByIdAndUpdate(req.params.id, { 
        name: r.name,
        code: r.code,
        currency: r.currency,
        currencySymbol: r.currencySymbol
    }, {
        new: true
    });

    if (!city) return res.status(404).send({ message: 'The city with the given ID was not found.' });
    
    return res.send(city);
}

const deleteCity = async (req, res) => {
    
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) return res.status(404).send({ message: 'The city with the given ID was not found' });
    return res.send(city);
}

// --------------- STATES --------------

const createState = async (req, res) => {
    const { error } = validateState(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const country = await Country.findById(req.body.country);
    if (!country) return res.status(404).send('The country with the given ID was not found.');
    
    for (let x in req.body.names){
        country.states.push({ name: req.body.names[x] });
    }
    await country.save();
    return res.send(country);
}

const updateState = async (req, res) => {
    if (!req.body.name) return res.status(400).send({ message: 'name is required' });
               
    const state = await Country.find({ 'states._id': req.params.id });
    if (!state) return res.status(404).send({ message: 'The state with the given ID was not found' });

    await Country.update(
        { 'states._id': req.params.id },
        { $set:{ "states.$.name": req.body.name } },
        { upsert: true }
    );
    
    return res.send(await Country.find({ 'states._id': req.params.id }));
}

const deleteState = async (req, res) => {
    
    const state = await Country.findOne({ 'states._id': req.params.id });
    if (!state) return res.status(404).send('The state with the given ID was not found.');

    await Country.findByIdAndUpdate(state._id, {
        $pull: {
            states: {_id: req.params.id}
        }
    })
    return res.send(state);
}

router.get('/', auth, getAllCities);
router.get('/states/:country', auth, getAllStatesCountry);
router.get('/:id', auth, getOneCity);
router.post('/', auth, createCity);
router.put('/:id', auth, updateCity);
router.delete('/:id', auth, deleteCity);
router.post('/state/', auth, createState);
router.put('/state/:id', auth, updateState);
router.delete('/state/:id', auth, deleteState);

module.exports = router;