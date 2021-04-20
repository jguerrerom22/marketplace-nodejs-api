const config  = require('config');
const multer  = require('multer');
const upload = multer({ dest: config.get('tempResources') });
const auth = require('../../middleware/auth');
const asyncMiddleware = require('../../middleware/async');
const {Experience, validateExperience} = require('../../models/experience');
const {Company} = require('../../models/company');
const express = require('express');
const router = express.Router();

const experiencesMediaFolder = 'experiencesFiles/';

/**
 * Get a list of experiences
 * @param {object} req 
 * @param {object} res 
 */
const getExperiences = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 15;
    const sortBy = req.query.sortBy ? req.query.sortBy : '-createdAt';
    
    const today = new Date();
    const userId = req.user._id;

    // Filters
    let filters = {
        $or: [{'company.status.name': 'active'}, { 'user.status.name': 'active' }],
        createdAt: { $lte: today },
        expiresAt: { $gte: today }
    };
    if (req.query.city) filters['company.location.city._id'] = req.query.city;
    if (req.query.company) filters['company._id'] = req.query.company;

    const docs = await Experience.find(filters, {
        _id: 1, media: 1, description: 1, createdAt: 1, expiresAt: 1,
        'company._id': 1, 'company.name': 1, 'company.logo': 1
    })
    .skip(skip)
    .limit(limit)
    .sort(sortBy);

    return res.send(docs);
}

/**
 * Create an experience of a company or user
 * @param {object} req 
 * @param {object} res 
 */
const createExperience = async (req, res) => {
    const FileHandling = require('../../services/fileHandling');

    const { error } = validateExperience(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });

    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

    var companyInfo = null;
    var userInfo = null;
    if (req.body.company){
        companyInfo = await Company.findById(req.body.company);
        if (!companyInfo)  return res.status(400).send({ message: 'Invalid company.' });
        if (companyInfo.status.name != 'active') return res.status(400).send({ message: 'Company is not active.' });
    } else {
        userInfo = await User.findById(req.user._id).select('-access.password -cart -followers - following -shipping');
        if (userInfo.status != 'active') return res.status(400).send({ message: 'User is not active.' });
    }

    const r = req.body;
    const created = new Date();
    const expires = new Date(created.getTime() + (60 * 60 * 24 * 1000));

    // File upload
    const fileHandling = new FileHandling(req.file);
    const fileName = new Date().getTime();
    const uploadResponse = await fileHandling.saveFile(experiencesMediaFolder, fileName, ['image/png','image/jpg','image/jpeg', 'video/mp4'], []);

    if (uploadResponse.error) return res.status(400).send({ message: 'File was not uploaded' });

    let data = {
        media: uploadResponse[0],
        description: r.description,
        createdAt: created,
        expiresAt: expires,
        createdBy: req.user._id,
        views: []
    };
    if (companyInfo !== null) data.company = companyInfo;
    if (userInfo !== null) data.user = userInfo;

    const exp = new Experience(data);
    await exp.save();
    return res.send(exp);
}

router.get('/', auth, asyncMiddleware(getExperiences));
router.post('/', [auth, upload.single('file')], asyncMiddleware(createExperience));

module.exports = router;