const mongoose = require('mongoose');
const {ReviewSchema} = require('./review');
const {MediaSchema} = require('./media');
const {CompanySchema} = require('./company');
const {UserSchema} = require('./user');

const PostSchema = new mongoose.Schema({

    company: {
        type: CompanySchema,
        required: false
    },
    user: {
        type: UserSchema,
        required: false
    },
    description: {
        type: String,
        min: 1,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    media: {
        type: [[MediaSchema]],
        required: true
    },
    reviews: [ReviewSchema]
});

const Post = mongoose.model('Post', PostSchema);

exports.Post = Post; 
