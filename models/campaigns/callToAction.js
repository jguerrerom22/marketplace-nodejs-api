const Joi = require('joi');
const mongoose = require('mongoose');

const CallToActionSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        min: 3,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        required: true,
        minlength: 5,
        maxlength: 255,
        unique: true
    },
    city: {
        type: String,
        required: true,
        min: 3,
        trim: true
    },
    ip: {
        type: String,
        required: true,
        min: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const CallToAction = mongoose.model('Campaign_CallToAction', CallToActionSchema);

function validateRecord(record) {
    const schema = {
        name: Joi.string().min(3).required(),
        city: Joi.string().min(3).required(),
        email: Joi.string().min(5).max(255).required().email(),
        token: Joi.string().required()
    };
    return Joi.validate(record, schema);
}

exports.CampaignCallToAction = CallToAction; 
exports.validateRecord = validateRecord;