const winston = require('winston');
const config = require('config');
require('winston-mongodb');
require('express-async-errors');

// process.on('unhandledRejection', (ex) => {
//     throw ex
// });
const logging = {};
// const logging = winston.createLogger({
//     transports: [
//         //new winston.transports.Console(),
//         //new winston.transports.File({ filename: 'logs/logfile.log', level: 'info' }),
//         //new winston.transports.MongoDB({ db: config.get('db'), level: 'error' })
//     ],
//     exceptionHandlers: [
//         //new winston.transports.File({ filename: 'logs/exceptions.log' })
//     ]
// });

// if (process.env.NODE_ENV !== 'production') {
//     logging.add(new winston.transports.Console({
//         format: winston.format.simple()
//     }));
// }

//throw new Error('Somthing failed during startup');

module.exports = logging;