const Joi = require('joi');
const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        min: 1,
        required: true,
        trim: true
    },
    mask: {
        type: String,
        required: true,
        min: 10,
        trim: true
    },
	ownerName: {
        type: String,
        required: true,
        trim: true,
        min: 3
    },
    franchise: {
        type: String,
        required: true,
        trim: true,
        min: 3
    }
});

function validateCreditCard(data) {
    const schema = {
        id: Joi.string(),
		name: Joi.string().min(3).required(), 
		number: Joi.string().min(15),
		expMonth: Joi.string().min(1),
		expYear: Joi.number().min(new Date().getFullYear()),
		cvc: Joi.string().min(3).max(3)
    };
    return Joi.validate(data, schema);
}

exports.creditCardSchema = creditCardSchema;
exports.validateCreditCard = validateCreditCard;