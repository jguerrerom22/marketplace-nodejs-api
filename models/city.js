const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    stateId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    stateName: {
        type: String,
        required: true,
        min: 3
    },
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    countryName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    }
});

const City = mongoose.model('City', CitySchema);

function validateCity(city) {
    const schema = {
        name: Joi.string().min(3).required(),
        state: Joi.objectId().required()
    };
  
    return Joi.validate(city, schema);
}

exports.CitySchema = CitySchema;
exports.City = City;
exports.validateCity = validateCity;