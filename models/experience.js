const Joi = require('joi');
const mongoose = require('mongoose');
const {MediaSchema} = require('../models/media');
const {CompanySchema} = require('../models/company');
const {UserSchema} = require('../models/user');

const ExperienceSchema = new mongoose.Schema({
    media: {
        type: MediaSchema,
        required: true
    },
    description: String,
    company: CompanySchema,
    user: UserSchema,
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    views: {
        type: [new mongoose.Schema({
            userName: {
                type: String,
                trim: true,
                required: true
            },
            userPicture: String,
            seentAt: {
                type: Date,
                default: Date.now
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            deviceId: String
        })]
    }
});

const Experience = mongoose.model('Experience', ExperienceSchema);

function validateExperience(exp) {
    const schema = {
        company: Joi.objectId().min(1).required(),
        description: Joi.string()
    };
    return Joi.validate(exp, schema);
}

exports.Experience = Experience; 
exports.validateExperience = validateExperience;