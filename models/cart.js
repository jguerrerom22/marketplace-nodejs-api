const mongoose = require('mongoose');
const { ItemSchema } = require('./item');
const Joi = require('joi');

const CartSchema = new mongoose.Schema({
    item: {
        type: ItemSchema,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    selectableFields: new mongoose.Schema({
        _id: {
            type: String,
            required: false
        },
        fields: [new mongoose.Schema({
            name: {
                type: String,
                required: true,
                trim: true
            },
            value: {
                type: String,
                required: true,
                trim: true
            }
        })]
        
    }),
    createdAt: {
        type: Date,
        default: Date.now(),
        required: true
    }
});

function validateCart(item) {
    const schema = {
        item: Joi.objectId().required(),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        selectableFieldId: Joi.string().min(1),
        selectableFields: Joi.array().items(
            Joi.object().keys({
                name: Joi.string().min(1).required(),
                value: Joi.string().min(1).required()
            })
        )
    };
  
    return Joi.validate(item, schema);
}

exports.CartSchema = CartSchema;
exports.validateCart = validateCart;