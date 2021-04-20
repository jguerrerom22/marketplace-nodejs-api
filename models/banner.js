const {enums} = require('./enums');
const Joi = require('joi');
const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    mediaUrl: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: false
    },
    type: {
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
    }
});

const Banner = mongoose.model('Banner', BannerSchema);

exports.Banner = Banner;