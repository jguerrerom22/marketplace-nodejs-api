const mongoose = require('mongoose');
const Joi = require('joi');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        min: 1
    },
    rate: {
        type: Number,
        default: 5,
        min: 1,
        max: 5   
    }
});

function validateReview(review) {
    const schema = {
        comment: Joi.string().min(0).required(),
        rate: Joi.number().min(1).max(5).default(5)
    };
  
    return Joi.validate(review, schema);
}

exports.ReviewSchema = ReviewSchema;
exports.validateReview = validateReview;