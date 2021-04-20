const FileHandling = require('../services/fileHandling');
const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {Company} = require('../models/company');
const {User} = require('../models/user');
const {Item, validateItem} = require('../models/item');
const {validateReview} = require('../models/review');
const {Category} = require('../models/category');
const config = require('config');
const multer = require('multer');
const upload = multer({ dest: config.get('tempResources'), limits: { fileSize: (1024*1024*3)  }});
const express = require('express');
const router = express.Router();

const itemFilesFolder = 'itemsFiles/';

/**
 * Get a list of items
 * @param {object} req 
 * @param {object} res 
 */
const getAllItems = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const sortBy = req.query.sortBy ? req.query.sortBy : '-createdAt';
    
    // Filters
    let filters = { 'status.name': 'active', 'company.status.name': 'active' };
    if (req.query.search) filters['$text'] = { $search: req.query.search };
    if (req.query.city) filters['company.location.city._id'] = req.query.city;
    if (req.query.company) filters['company._id'] = req.query.company;
    if (req.query.category) filters['category._id'] = req.query.category;
    if (req.query.notCompany) filters['company._id'] = { $ne: req.query.notCompany };
    if (req.query.notProduct) filters['_id'] = { $ne: req.query.notProduct };
    if (req.query.pricegte || req.query.pricelte){
        filters['price'] = {};
        if (req.query.pricelte) filters['price']['$lte'] = req.query.pricelte;
        if (req.query.pricegte) filters['price']['$gte'] = req.query.pricegte;
    } 
    
    const items = await Item.find(filters)
    .skip(skip)
    .limit(limit)
    .sort(sortBy);
    return res.send(items);
}

/**
 * Get Categories
 * @param {object} req 
 * @param {object} res 
 */
const getCategories = async (req, res) => {
    // Filters
    let filters = { 'status.name': 'active', 'company.status.name': 'active' };
    if (req.query.company) filters['company._id'] = req.query.company;

    const items = await Item.find(filters).distinct('category');
    return res.send(items);
}

/**
 * Get items by category
 * @param {object} req
 * @param {object} res 
 */
const getCategoriesAndItems = async (req, res) => {
    
    // Filters
    let filters = { 'status.name': 'active', 'company.status.name': 'active' };
    if (req.query.company) filters['company._id'] = req.query.company;
    if (req.query.type) filters['type'] = req.query.type;

    const items = await Item.find(filters);
    var dataCategories = {}, dataItems = {}, data = [];
    for (let x in items){
        let item = items[x];

        if (!dataCategories[item.category._id]) dataCategories[item.category._id] = { 
            id: item.category.id,
            name: item.category.name,
            icon: item.category.icon
        };

        if (!dataItems[item.category._id]) dataItems[item.category._id] = [];
        dataItems[item.category._id].push({ 
            'id': item._id,
            'type': item.type,
            'title': item.title,
            'price': item.price,
            'profilePicture': item.profilePicture,
            'description': item.description,
            'company': {
                'id': item.company._id,
                'name': item.company.name,
                'logo': item.company.logo
            }
        });
    }

    for (let y in dataCategories){
        data.push({
            'category': dataCategories[y],
            'items': dataItems[y]
        })
    }
    return res.send(data);
}

/**
 * Get thhe information of a specific item
 * @param {object} req 
 * @param {object} res 
 */
const getOneItem = async (req, res) => {
    var item = await Item.findById(req.params.id, {
        type:1, media:1, _id:1, title:1, price:1, profilePicture:1, description:1, category: 1, selectableFields:1, reviews:1,
        'company._id':1, 'company.name': 1, 'company.logo':1, 'company.coverPicture':1,
        'company.location.city._id':1, 'company.location.city.name':1, 'company.stats.rating':1
    }).populate({ 
        path: 'reviews.user',
        model: 'User',
        select: '_id firstName lastName profilePicture'
    });
    if (!item) return res.status(404).send({ message: 'The item with the given ID was not found.' });
    
    // check if company is followed by user
    const follower = await Company.find({ _id: item.company._id, followers: req.user._id });
    const isFollowed = (follower.length !== 0);

    return res.send({
        type: item.type,
        media: item.media,
        _id: item._id,
        title: item.title,
        price: item.price,
        profilePicture: item.profilePicture,
        description: item.description,
        category: item.category,
        selectableFields: item.selectableFields,
        reviews: item.reviews,
        company: item.company,
        isFollowed: isFollowed
    });
}

/**
 * Create an item
 * @param {object} req 
 * @param {object} res 
 */
const createItem = async (req, res) => {
    const { error } = validateItem(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });

    if (!req.files) return res.status(400).send({ message: 'Media is required.' });

    const company = await Company.findById(req.body.company);
    if (!company) return res.status(400).send({ message: 'Invalid company.' });
    
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send({ message: 'Invalid category.' });

    // Upload all the media files
    var media = [];
    var mediaReturn = [];
    for (let x in req.files){
        let file = req.files[x];
        let fileHandling = new FileHandling(file);
        let fileName = new Date().getTime();
        let isVideo = (file.mimetype == 'video/mp4'); 
        let sizes = (isVideo) ? [] : ['md'];
        let uploadResponse = await fileHandling.saveFile(itemFilesFolder, fileName, ['image/png','image/jpg','image/jpeg', 'video/mp4'], sizes);
        let mdFile = (isVideo) ? uploadResponse.find(x => x.size=='original') : uploadResponse.find(x => x.size=='md');
        mediaReturn.push({ url: mdFile.url, type: mdFile.type });
        media.push(uploadResponse);
    }
    
    const item = new Item({
        title: req.body.title,
        type: req.body.type,
        price: req.body.price,
        stock: req.body.stock,
        profilePicture: media[0],
        description: req.body.description,
        category: category,
        company: company,
        media: media,
        status: { name: 'active', notes: '' },
        selectableFields: (req.body.selectableFields) ? JSON.parse(req.body.selectableFields) : [],
        reviews: [],
        createdAt: Date.now()
    });

    await item.save();
    return res.send({
        id: item._id,
        title: item.title,
        type: item.type,
        price: item.price,
        description: item.description,
        category: item.category,
        media: mediaReturn,
        selectableFields: item.selectableFields
    });
}

/**
 * Create a review of an item
 * @param {object} req 
 * @param {object} res 
 */
const createReview = async (req, res) => {
    const { error } = validateReview(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(400).send({ message: 'Invalid item.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(400).send({ message: 'Invalid user.' });

    const r = req.body;
    const created = new Date();
    
    const review = {
        user: user._id,
        date: created,
        comment: r.comment,
        rate: r.rate
    };
    item.reviews.push(review);

    await item.save();
    return res.send(review);
}

/**
 * Update an item
 * @param {object} req 
 * @param {object} res 
 */
const updateItem = async(req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(400).send({ message: 'Invalid item.' });

    if (req.body.title) item.title = req.body.title;
    if (req.body.type) item.type = req.body.type;
    if (req.body.description) item.description = req.body.description;
    if (req.body.price) item.price = req.body.price;
    if (req.body.stock) item.stock = req.body.stock;
    if (req.body.category) {
        const category = await Category.findById(req.body.category);
        if (!category) return res.status(400).send({ message: 'Invalid category.' });
        item.category = category;
    }
    if (req.body.selectableFields) item.selectableFields = JSON.parse(req.body.selectableFields);

    // Upload all the media files
    if (req.body.imagesTypes){
        const types = req.body.imagesTypes.split(',');
        let media = [], mediaReturn = [], indImages = 0;
        for (let i in types) {
            if (types[i] === 'url'){
                media.push(item.media[i]);
            } else {
                let file = req.files[indImages];
                let fileHandling = new FileHandling(file);
                let fileName = new Date().getTime();
                let isVideo = (file.mimetype == 'video/mp4'); 
                let sizes = (isVideo) ? [] : ['md'];
                let uploadResponse = await fileHandling.saveFile(itemFilesFolder, fileName, ['image/png','image/jpg','image/jpeg', 'video/mp4'], sizes);
                let mdFile = (isVideo) ? uploadResponse.find(x => x.size=='original') : uploadResponse.find(x => x.size=='md');
                mediaReturn.push({ url: mdFile.url, type: mdFile.type });
                media.push(uploadResponse);
                indImages++;
            }
        };
        item.media = media;
    }
    

    await item.save();
    return res.send(item);
}

const deleteTestItems = async (req, res) => {
    await Item.deleteMany({ type: 'test' });
    return res.send("ok");
}

router.get('/', auth, asyncMiddleware(getAllItems));
router.get('/categories', auth, asyncMiddleware(getCategories));
router.get('/categoriesAndItems', auth, asyncMiddleware(getCategoriesAndItems));
router.get('/:id', auth, asyncMiddleware(getOneItem));
router.post('/', [auth, upload.array('media', 10)], asyncMiddleware(createItem));
router.post('/:id/review', auth, asyncMiddleware(createReview));
router.put('/:id', [auth, upload.array('media', 10)], updateItem);
router.delete('/test', auth, deleteTestItems);

module.exports = router;