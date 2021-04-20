const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const mongoose = require('mongoose');

const CountrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    code: {
        type: String,
        trim: true,
        min: 2
    },
    currency: {
        type: String,
        required: true,
        min: 1
    },
    currencySymbol: {
        type: String,
        required: true,
        min: 1
    },
    states: {
        type: [new mongoose.Schema({
            name: {
                type: String,
                required: true,
                min: 3
            }
        })]
    }
});

const Country = mongoose.model('Country', CountrySchema);

function validateCountry(country) {
    const schema = {
        name: Joi.string().min(3).required(),
        code: Joi.string().min(2).required(),
        currency: Joi.string().min(1).required(),
        currencySymbol: Joi.string().min(1).required(),
        states: Joi.array().items(
            Joi.object().keys({
                name: Joi.string().min(3).required(),
            })
        )
    };
    return Joi.validate(country, schema);
}

function validateState(state) {
    const schema = {
        names: Joi.array().min(1).required(),
        country: Joi.objectId().required()
    };
    return Joi.validate(state, schema);
}

exports.Country = Country;
exports.validateCountry = validateCountry;
exports.validateState = validateState;