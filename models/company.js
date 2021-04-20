const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const mongoose = require('mongoose');
const {enums} = require('./enums');
const {CitySchema} = require('./city');
const {ReviewSchema} = require('./review');
const {MediaSchema} = require('./media');

const CompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    logo: {
        type: [MediaSchema],
        required: true
    },
    coverPicture: {
        type: [MediaSchema],
        required: true
    },
    slogan: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        required: true   
    },
    status: {
        type: new mongoose.Schema({
            name: {
                type: String,
                required: true,
                enum: enums['status'],
                default: enums['status'][0]
            },
            notes: {
                type: String,
                trim: true
            }
        })
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    media: {
        type: [new mongoose.Schema({
            name: {
                type: String,
                required: true
            },
            url: {
                type: [MediaSchema],
                required: true
            },
            order: {
                type: Number,
                default: 1    
            }
        })]
    },
    location: {
        type: new mongoose.Schema({
            address: {
                type: String,
                required: true,
                min: 5
            },
            coordinates: {
				type: [Number],
				required: true
            },
            city: {
                type: CitySchema,
                required: true
            }
        }),
        required: false
    },
    contact: {
        type: new mongoose.Schema({
            phone: {
                type: String,
                required: true,
                min: 7
            },
            email: {
                type: String,
                required: true,
                minlength: 5,
                maxlength: 255
            }
        }),
        required: true
    },
    socialMedia: {
        type: [new mongoose.Schema({
            name: {
                type: String,
                required: true,
                min: 2
            },
            description: {
                type: String,
                required: true,
                min: 5
            }
        })],
        required: false
    },
    includedCities: {
        type: [String],
        required: true
    },
    excludedCities: {
        type: [String],
        required: true
    },
    reviews: [ReviewSchema],
    followers: [mongoose.Schema.Types.ObjectId],
    following: [mongoose.Schema.Types.ObjectId],
    stats: {
        type: new mongoose.Schema({
            rating: {
                type: Number,
                required: true,
                min: 1,
                max: 10,
                default: 10
            }
        })
    }
});

const Company = mongoose.model('Company', CompanySchema);

function validateCompany(company) {
    const schema = {
        name: Joi.string().min(3).required(),
        slogan: Joi.string(),
        description: Joi.string().required(),
        address: Joi.string().min(5).required(),
        long: Joi.number(),
        lat: Joi.number(),
        city: Joi.objectId().required(),
        phone: Joi.string().min(7).required(),
        email: Joi.string().min(5).max(255).required().email(),
        socialMedia: Joi.array().items(
            Joi.object().keys({
                name: Joi.string().min(3).required(),
                description: Joi.string().min(5).required()
            })
        ),
        media: Joi.array().items(
            Joi.object().keys({
                name: Joi.string().min(3).required(),
                url: Joi.array(),
                order: Joi.number()
            })
        )
    };
    return Joi.validate(company, schema);
}

function validateCompanyUpdating(company) {
    const schema = {
        name: Joi.string().min(3).required(),
        slogan: Joi.string(),
        description: Joi.string().required(),
        address: Joi.string().min(5).required(),
        long: Joi.number(),
        lat: Joi.number(),
        city: Joi.objectId().required(),
        phone: Joi.string().min(7).required(),
        email: Joi.string().min(5).max(255).required().email(),
        socialMedia: Joi.array().items(
            Joi.object().keys({
                name: Joi.string().min(3).required(),
                description: Joi.string().min(5).required()
            })
        )
    };
    return Joi.validate(company, schema);
}

exports.CompanySchema = CompanySchema;
exports.Company = Company;
exports.validateCompany = validateCompany;
exports.validateCompanyUpdating = validateCompanyUpdating;