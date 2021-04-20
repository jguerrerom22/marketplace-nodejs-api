const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('config');
const mongoose = require('mongoose');
const {enums} = require('./enums');
const {CartSchema} = require('./cart');
const {ShippingSchema} = require('./shipping');
const {creditCardSchema} = require('./creditCard');

const UserSchema = new mongoose.Schema({
	socialId: String,
	paymentProviderId: String,
	identification: String,
	firstName: {
		type: String,
		required: true,
		minlength: 3,
		maxlength: 50,
		trim: true
	},
	lastName: {
		type: String,
		trim: true
	},
	profilePicture: String,
	access: {
		type: new mongoose.Schema({
			password: {
				type: String,
				required: false,
				minlength: 5,
				maxlength: 1024
			},
			email: {
				type: String,
				trim: true,
				required: true,
				minlength: 5,
				maxlength: 255
			},
			ip: String,
			isAdmin: {
				type: Boolean,
				required: true,
				default: false
			}
		})
	},
	contact: {
		type: new mongoose.Schema({
			phoneNumber: {
				type: String,
				minlength: 5,
				maxlength: 15
			}
		})
	},
	additional: {
		type: new mongoose.Schema({
			documentType: String,
			document: String,
			personType: String,
			bankId: String,
			bankName: String
		})
	},
	shipping: [ShippingSchema],
	creditCards: [creditCardSchema],
	cart: [CartSchema],
	status: {
		type: String,
		required: true
	},
	followers: [mongoose.Schema.Types.ObjectId],
    following: [mongoose.Schema.Types.ObjectId]
});

UserSchema.virtual('fullName').get(function () {
	return this.firstName + ' ' + this.lastName;
});

UserSchema.methods.generateAuthToken = function(isVisitor = false, tokenExpires = false){
	let dataJwt = { _id: this._id, isVisitor: isVisitor, isAdmin: this.access.isAdmin };
	if (tokenExpires){
		const expirationDate = new Date().getTime() + (60 * 60 * 12 * 1000); // 12 hours
		dataJwt['expirationDate'] = expirationDate;
	}
	const token = jwt.sign(dataJwt, config.get('jwtPrivateKey'));
	return token;
}

const User = mongoose.model('User', UserSchema);

function validateUser(user) {
    const schema = {
		identification: Joi.string().min(1),
		firstName: Joi.string().min(3).max(50).required(),
		lastName: Joi.string().min(3).required(),
		profilePicture: Joi.string(),
		email: Joi.string().min(5).max(255).required().email(),
		password: Joi.string().min(5).max(1024),
		ip: Joi.string(),
		isAdmin: Joi.boolean(),
		phoneNumber: Joi.string().min(5).max(15)
    };
    return Joi.validate(user, schema);
}

function validateUserUpdate(user) {
    const schema = {
		validation: Joi.string().min(6).required(), 
		firstName: Joi.string().min(2),
		lastName: Joi.string().min(2),
		password: Joi.string().min(5).max(1024),
		phoneNumber: Joi.string().min(5).max(15)
    };
    return Joi.validate(user, schema);
}

exports.User = User;
exports.UserSchema = UserSchema;
exports.validateUser = validateUser;
exports.validateUserUpdate = validateUserUpdate;