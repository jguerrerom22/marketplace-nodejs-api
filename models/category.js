const Joi = require('joi');
const mongoose = require('mongoose');
const {enums} = require('./enums');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 5
    },
    type: {
        type: String,
        enum: enums['productType'],
        default: enums['productType'][0]
    },
    icon: String
});

const Category = mongoose.model('Category', CategorySchema);

function validateCategory(category) {
    const schema = {
        name: Joi.string().min(3).required(),
        type: Joi.string().required().valid(enums['productType']),
        icon: Joi.string().min(3)
    };
    return Joi.validate(category, schema);
}

exports.CategorySchema = CategorySchema;
exports.Category = Category;
exports.validateCategory = validateCategory;