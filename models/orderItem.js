const Joi = require('joi');
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const {CartSchema} = require('./cart');
const {ShippingSchema} = require('./shipping');
const {UserSchema} = require('./user');
const {enums} = require('./enums');


const OrderItemSchema = new mongoose.Schema({

    orderId: {
        type: Number,
        required: true
    },
    transactionId: {
        type: Number,
        required: true
    },
    user: {
        type: UserSchema,
        required: true
    },
    detail: {
        type: [CartSchema],
        required: true,
        min: 1
    },
    total: {
        type: Number,
        required: true
    },
    payment: {
        type: String,
        required: true,
        enum: enums['paymentTypes']
    },
    paymentProviderStatus: Object,
    status: {
        type: new mongoose.Schema({
            name: {
                type: String,
                required: true,
                enum: enums['status']
            },
            notes: {
                type: String,
                trim: true
            }
        })
    },
    shipping: {
        type: ShippingSchema,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

autoIncrement.initialize(mongoose.connection);

OrderItemSchema.plugin(autoIncrement.plugin, {
    model: 'OrderItem',
    field: 'orderId',
    startAt: '1000'
});

const OrderItem = mongoose.model('OrderItem', OrderItemSchema);

function validatePSEpayment(user) {
    const schema = {
		bank: Joi.string().min(1),
		value: Joi.string().min(3).max(50).required()
    };

    const s = {
        bank: "1151",
        invoice: "1472050778",
        description: "Compra en ku-vid",
        value: "10000",
        tax: "0",
        tax_base: "0",
        currency: "COP",
        type_person: "0",
        doc_type: "CC",
        doc_number: "10358519",
        name: "kuvid",
        last_name: "PAYCO",
        email: "ej@ku-vid.com",
        country: "CO",
        cell_phone: "3010000001",
    };

    return Joi.validate(user, schema);
}

function validateCashPayment(user) {
    const schema = {
		identification: Joi.string().min(1),
		firstName: Joi.string().min(3).max(50).required()
    };
    return Joi.validate(user, schema);
}

function validateCardPayment(user) {
    const schema = {
		identification: Joi.string().min(1),
		firstName: Joi.string().min(3).max(50).required()
    };
    return Joi.validate(user, schema);
}

exports.OrderItem = OrderItem;
exports.validatePSEpayment = validatePSEpayment;
exports.validateCashPayment = validateCashPayment;
exports.validateCardPayment = validateCardPayment;