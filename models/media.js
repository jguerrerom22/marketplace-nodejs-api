const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
    size: {
        type: String,
        trim: true,
        required: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        trim: true
    }
});

exports.MediaSchema = MediaSchema;