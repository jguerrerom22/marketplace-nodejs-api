const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const mongoose = require('mongoose');
const {CitySchema} = require('./city');

const ShippingSchema = new mongoose.Schema({
    name: {
        type: String,
        min: 1,
        trim: true
    },
    phoneNumber: {
        type: String,
        min: 7,
        trim: true
    },
	address: {
        type: String,
        required: true,
        trim: true,
        min: 10
    },
    neighborhood: {
        type: String,
        trim: true
    },
    city: {
        type: CitySchema,
        required: true
    },
    notes: {
        type: String,
        trim: true
    },
    coordinates: {
        type: [Number],
        required: true
    }
});

function validateShipping(item) {
    const schema = {
        name: Joi.string().min(2).required(),
        phoneNumber: Joi.string().min(7).required(),
        address: Joi.string().min(3).required(),
        neighborhood: Joi.string().min(3).required(),
        city: Joi.objectId().required(),
        notes: Joi.string().min(1)
    };
  
    return Joi.validate(item, schema);
}

exports.ShippingSchema = ShippingSchema;
exports.validateShipping = validateShipping;