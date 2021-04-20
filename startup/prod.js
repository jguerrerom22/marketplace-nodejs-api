const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
var cors = require('cors');

module.exports = function(app){
    app.use(cors());
    app.use(helmet());
    app.use(compression());
    app.use(bodyParser.json({ limit: '2mb' }));
}