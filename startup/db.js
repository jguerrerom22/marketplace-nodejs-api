//const logging = require('./logging');
const config = require('config');
const mongoose = require('mongoose');

module.exports = function(){
    mongoose.connect(config.get('db'), { useUnifiedTopology: true, useNewUrlParser: true })
        .then(() => console.log('Connected to MongoDB...'))
        .catch((e) => console.log(e));
}