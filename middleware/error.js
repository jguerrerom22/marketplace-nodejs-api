//const logging = require('../startup/logging');

module.exports = function(err, req, res, next){
    console.log(err.message, err);
    res.status(500).send({ message: 'Something failed' });
}