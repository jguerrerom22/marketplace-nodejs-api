const auth = require('../../middleware/auth');
const {User, validateUser} = require('../../models/user');
const {OrderItem} = require('../../models/orderItem');
const {Item} = require('../../models/item');
const {validateShipping} = require('../../models/shipping');
const express = require('express');
const { City } = require('../../models/city');
const router = express.Router();

/**
 * Get all the orders of user
 * @param {object} req 
 * @param {object} res 
 */
const getOrdersUser = async (req, res) => {
    const orders = await OrderItem.find({ 'user._id': req.user._id },{ user: 0 }).sort('-createdAt');
    return res.send(orders);
}

/**
 * Create a new order
 * @param {object} req 
 * @param {object} res 
 */
const createOrderItem = async (req, res) => {
    const p = req.body;
    if (p.total <= 0) return res.status(400).send({ message: 'Order cannot be zero' });

    const { error } = validateShipping(p.shipping); 
    if (error) return res.status(400).send({ message: error.details[0].message });
    
    // Validate city
    const city = await City.findById(p.shipping.city);
    if (!city) return res.status(404).send({ message: 'The city with the given ID was not found' });
    p.shipping.city = city;

    if (!p.detail || p.detail.length === 0) return res.status(400).send({ message: 'Items are required' });
    
    var user;
    // If visitor, validation is required otherwise user is the token user
    if (p.isVisitor){
        const { errorUser } = validateUser(p.user); 
        if (errorUser) return res.status(400).send({ message: error.details[0].message });
        user = p.user;
    } else {
        user = await User.findById(req.user._id).select('-access.password -cart -followers -following -shipping');
        if (!user) return res.status(400).send({ message: 'Invalid user.' });
    }
    
    let details = [];
    for (let x in p.detail){
        let item = p.detail[x];

        // Validate Item
        let itemInfo = await Item.findById(item.item)
            .select('-media -inventory -reviews -company.slogan -company.coverPicture -company.createdAt -company.media -company.reviews -company.followers -company.following -company.stats');
        if (!item) return res.status(400).send({ message: 'Invalid item ID: ' + item.item });

        // Validate selectable Fields
        if (item.selectableFields) {
            for (let y in item.selectableFields){
                let sFields = item.selectableFields[y];
                if (!sFields.name || !sFields.value) return res.status(400).send({ message: 'Name and value are required for selectableFields' });
            }
        }

        // Add selectable fields
        details.push({
            item: itemInfo,
            quantity: item.quantity,
            selectableFields: item.selectableFields,
            notes: item.notes
        });
    }

    const data = {
        shipping: p.shipping,
        user: user,
        detail: details,
        total: p.total,
        createdAt: Date.now(),
        status: {
            name: 'active',
            notes: ''
        }
    }

    const order = new OrderItem(data);
    await order.save();
    return res.send(order);
}

router.get('/me', auth, getOrdersUser);
router.post('/', auth, createOrderItem);

module.exports = router;