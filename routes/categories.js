const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {Category, validateCategory} = require('../models/category');
const express = require('express');
const router = express.Router();

const getAllCategories = async (req, res) => {
    const sortBy = req.query.sortBy ? req.query.sortBy : '_id';
    
    // Filters
    let filters = {};
    if (req.query.type) filters['type'] = req.query.type;
        
    const categories = await Category.find(filters, { __v: 0 }).sort(sortBy);
    return res.send(categories);
}

const getOneCategory = async (req, res) => {
    const category = await Item.findById(req.params.id);
    if (!category) return res.status(404).send({ message: 'The category with the given ID was not found.' });
    return res.send(category);
}

const createCategory = async (req, res) => {
    const { error } = validateCategory(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const category = new Category({
        name: req.body.name,
        type: req.body.type,
        icon: req.body.icon
    });

    await category.save();
    return res.send(category);
}

router.get('/', auth, asyncMiddleware(getAllCategories));
router.get('/:id', auth, asyncMiddleware(getOneCategory));
router.post('/', auth, asyncMiddleware(createCategory));

module.exports = router;