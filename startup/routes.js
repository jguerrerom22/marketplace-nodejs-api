const express = require('express');

//----------- Swaggger Documentation
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'Ku-vid API',
            description: 'API de ku-vid',
            contact: {
                name: 'Jonathan Guerrero'
            },
            servers: ['http://localhost:3000']
        }
    },
    apis: ['index.js']
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);


module.exports = function(app){
    app.use(express.json());

    // Documentation
    app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

    app.use('/auth/', require('../routes/auth'));
    app.use('/users/', require('../routes/users'));
    app.use('/companies/', require('../routes/companies'));
    app.use('/countries/', require('../routes/countries'));
    app.use('/cities/', require('../routes/cities'));
    app.use('/categories/', require('../routes/categories'));
    app.use('/items/', require('../routes/items'));

    // APP
    app.use('/app/banners/', require('../routes/app/banners'));

    // Campaigns
    app.use('/campaigns/callToAction/', require('../routes/campaigns/callToAction'));

    // Social media
    app.use('/social/experiences/', require('../routes/social/experiences'));
    app.use('/social/posts/', require('../routes/social/posts'));
    
    // Shopping
    app.use('/shop/ordersItems/', require('../routes/shop/ordersItem'));
    app.use('/shop/payment/', require('../routes/shop/payment'));

    app.use(require('../middleware/error'));
};