const bodyParser = require('body-parser');
var cors = require('cors');

module.exports = function(app){
    app.use(cors());
    app.use(bodyParser.json({ limit: '50mb' }));
}