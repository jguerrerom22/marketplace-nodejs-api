const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const mongoose = require('mongoose');
const {enums} = require('./enums');
const {CompanySchema} = require('./company');
const {ReviewSchema} = require('./review');
const {CategorySchema} = require('./category');
const {MediaSchema} = require('./media');

const ItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        min: 5,
        trim: true
    },
    type: {
        type: String,
		required: true,
		enum: enums['productType'],
		default: enums['productType'][0]
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    description: {
        type: String,
        trim: true,
        max: 250
    },
    category: {
        type: CategorySchema,
        required: true
    },
    profilePicture: {
        type: [MediaSchema],
        required: true
    },
    media: {
        type: [[MediaSchema]],
        required: true
    },
    company: {
        type: CompanySchema,
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
    selectableFields: {
        type: [new mongoose.Schema({
            options: [new mongoose.Schema({
                name: {
                    type: String,
                    required: true
                },
                value: {
                    type: String,
                    required: true
                }
            })],
            price: {
                type: Number,
                required: true
            },
            stock: {
                type: Number,
                required: true,
                default: 0
            }
        })],
        required: false
    } ,
    inventory: {
        type: new mongoose.Schema({
            stock: {
                type: Number,
                required: true,
                min: 1
            }
        })
    },
    reviews: [ReviewSchema],
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
});

const Item = mongoose.model('Item', ItemSchema);

function validateItem(item) {
    const schema = {
        title: Joi.string().min(3).required(),
        type: Joi.string().required().valid(enums['productType']),
        price: Joi.number().required(),
        stock: Joi.number(),
        description: Joi.string().min(5).required(),
        category: Joi.objectId().required(),
        company: Joi.objectId().required(),
        selectableFields: Joi.string()
        // selectableFields: Joi.array().items(
        //     Joi.object().keys({
        //         options: Joi.array().items(
        //             Joi.object().keys({
        //                 name: Joi.string().min(1).required(),
        //                 value: Joi.string().min(1).required()
        //             })
        //         ),
        //         price: Joi.number().min(1).required(),
        //         stock: Joi.number().min(0).required()
        //     })
        // )
    };
  
    return Joi.validate(item, schema);
}

exports.Item = Item;
exports.ItemSchema = ItemSchema;
exports.validateItem = validateItem;