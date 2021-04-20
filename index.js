const express = require('express');
const app = express();
//const logging = require('./startup/logging');

if (process.env.NODE_ENV == 'production'){
    require('./startup/prod')(app);
} else {
    require('./startup/dev')(app);
}

require('./startup/routes')(app);
require('./startup/db')();
require('./startup/config')();

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0',  console.log(`Listening on port ${port}...`));