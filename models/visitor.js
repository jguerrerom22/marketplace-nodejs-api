const mongoose = require('mongoose');
const {enums} = require('./enums');
const {CartSchema} = require('./cart');
const {ShippingSchema} = require('./shipping');

const VisitorSchema = new mongoose.Schema({
	identification: String,
	firstName: {
		type: String,
		minlength: 3,
		maxlength: 50,
		trim: true
	},
	lastName: {
		type: String,
		trim: true
    },
    email: {
        type: String,
        trim: true,
        minlength: 5,
        maxlength: 255
    },
    ip: String,
	contact: {
		type: new mongoose.Schema({
			phoneNumber: {
				type: String,
				minlength: 5,
				maxlength: 15
			}
		})
	},
	shipping: [ShippingSchema],
	status: {
		type: String,
		required: true
	},
	cart: [CartSchema]
});

const Visitor = mongoose.model('Visitor', VisitorSchema);

function validateShipping(user) {
    const schema = {
		address: Joi.string().min(5).required(),
		neighborhood: Joi.string(),
		city: Joi.objectId().required(),
		notes: Joi.string(),
		long: Joi.number(),
        lat: Joi.number(),
    };
    return Joi.validate(user, schema);
}

exports.Visitor = Visitor;
exports.validateShippingVisitor = validateShipping;