const config = require('config');
const multer  = require('multer');
const upload = multer({ dest: config.get('tempResources') });
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncMiddleware = require('../middleware/async');
const {Company, validateCompany, validateCompanyUpdating} = require('../models/company');
const {User} = require('../models/user');
const {City} = require('../models/city');
const { Post } = require('../models/post');
const { Experience } = require('../models/experience');
const { Item } = require('../models/item');
const { validateReview } = require('../models/review');

const logoImagesFolder = 'companyLogos/';
const coverImagesFolder = 'companyCoverImages/';

/**
 * Get a list of companies
 * @param {object} req 
 * @param object} res 
 */
const getAllCompanies = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const sortBy = req.query.sortBy ? req.query.sortBy : '-name';
    
    // Filters
    let filters = { 'status.name': 'active' };
    if (req.query.city)
        filters['location.city._id'] = req.query.city;
    if (req.query.status)
        filters['status.name'] = req.query.status;

    const companies = await Company.find(filters, '_id name logo coverPicture slogan description status.name location.city.name location.city.stateName socialMedia reviews stats.rating createdAt')
    .skip(skip)
    .limit(limit)
    .sort(sortBy);
    return res.send(companies);
}

/**
 * Get the info of a company
 * @param {object} req 
 * @param {object} res 
 */
const getOneCompany = async (req, res) => {
    const company = await Company.findById(req.params.id).populate({ 
        path: 'reviews.user',
        model: 'User',
        select: '_id firstName lastName profilePicture'
    });
    if (!company) return res.status(404).send({ message: 'The company with the given ID was not found.' });
    const currentReview = company.reviews.filter(x => x.user == req.user._id);
    return res.send({
        _id: company._id,
        name: company.name,
        description: company.description,
        slogan: company.slogan,
        logo: company.logo,
        coverPicture: company.coverPicture,
        isFollowed: (company.followers.indexOf(req.user._id) >= 0),
        review: (currentReview ? currentReview[0] : {}),
        reviews: company.reviews,
        followers: company.followers.length,
        following: company.following.length,
        rating: company.stats.rating
    });
}

/**
 * Create a company
 * @param {object} req 
 * @param {object} res 
 */
const createCompany = async (req, res) => {
    
    const FileHandling = require('../services/fileHandling');
    
    const { error } = validateCompany(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });

    if(!req.files) return res.status(400).send({ message: 'No file uploaded' });
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(400).send({ message: 'Invalid owner.' });

    const city = await City.findById(req.body.city);
    if (!city) return res.status(400).send({ message: 'Invalid city.' });

    // Upload logo
    const fileHandling = new FileHandling(req.files.logo[0]);
    let fileName = new Date().getTime();
    const logoImages = await fileHandling.saveFile(logoImagesFolder, fileName, ['image/png','image/jpg','image/jpeg'], ['xs','md']);

    // Upload cover image
    let coverImages = [];
    if (req.files.cover){
        const fileHandlingCover = new FileHandling(req.files.cover[0]);
        fileName = new Date().getTime();
        coverImages = await fileHandlingCover.saveFile(coverImagesFolder, fileName, ['image/png','image/jpg','image/jpeg'], ['xs','md']);
    }
    
    let coordinates = (req.body.long) ? [req.body.long, req.body.lat] : undefined;
    const company = new Company({
        name: req.body.name,
        logo: logoImages,
        coverPicture: coverImages,
        slogan: req.body.slogan,
        description: req.body.description,
        status: {
            name: 'pending',
            notes: ''
        },
        owner: user._id,
        location: {
            address: req.body.address,
            coordinates: coordinates,
            city: {
                _id: city._id,
                name: city.name,
                stateId: city.stateId,
                stateName: city.stateName,
                countryId: city.countryId,
                countryName: city.countryName 
            }
        },
        contact: {
            phone: req.body.phone,
            email: req.body.email
        },
        socialMedia: req.body.socialMedia,
        stories: [],
        reviews: [],
        followers: [],
        following: [],
        stats: {
            rating: 10
        }
    });

    await company.save();
    return res.send(company);
}

/**
 * Create a review of a company
 * @param {object} req 
 * @param {object} res 
 */
const createReview = async (req, res) => {

    if (req.user.isVisitor === false){
        const { error } = validateReview(req.body); 
        if (error) return res.status(400).send({ message: error.details[0].message });
                
        const company = await Company.findById(req.params.id);
        if (!company) return res.status(400).send({ message: 'Invalid company.' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(400).send({ message: 'Invalid user.' });

        const r = req.body;
        const created = new Date();

        if (company.reviews.length > 0){
            // Remove the current rating of the user
            const currentReview = company.reviews.filter(x => x.user == req.user._id);
            if (currentReview.length > 0){
                company.reviews.pull(currentReview[0]);
            } 

            // Update the average rating
            if (company.reviews.length >= 3){
                const newStatsRating = (company.stats.rating * company.reviews.length + r.rate) / (company.reviews.length + 1);
                company.stats.rating = Math.round(newStatsRating * 10) / 10
            }
        }
        
        const review = {
            user: user._id,
            date: created,
            comment: r.comment,
            rate: r.rate
        };
        
        company.reviews.push(review);
        await company.save();

        return res.status(201).send({ review, statsRating: company.stats.rating });
    }
    return res.status(403).send({ message: 'User not allowed' });
}

/**
 * Activate or reject a company
 * @param {object} req 
 * @param {object} res 
 */
const activateCompany = async (req, res) => {

    if (!req.user.isAdmin) return res.status(401).send({ message: 'Access denied' });

    const isApproved = req.body.isApproved;
    if (isApproved == undefined) return res.status(400).send({ message: 'isApproved is required' });
    
    let company = await Company.findById(req.params.company);
    if (!company) return res.status(400).send({ message: 'Invalid company.' });

    if (company.status.name != 'pending') return res.status(400).send({ message: 'Company has already been accepted/rejected.' });
    
    if (isApproved)
        company.status.name = 'active';
    else {
        company.status = {
            name: 'rejected',
            notes: req.body.notes
        }
    }
    await company.save();
    return res.send({ status: 'success' });
}

/**
 * Update a company
 * @param {object} req 
 * @param {object} res 
 */
const updateCompany = async (req, res) => {
    
    const { error } = validateCompanyUpdating(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });

    const city = await City.findById(req.body.city);
    if (!city) return res.status(400).send({ message: 'Invalid city.' });
    
    let coordinates = (req.body.long) ? [req.body.long, req.body.lat] : undefined;
    const company = await Company.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        slogan: req.body.slogan,
        description: req.body.description,
        location: {
            address: req.body.address,
            coordinates: coordinates,
            city: {
                _id: city._id,
                name: city.name,
                stateId: city.stateId,
                stateName: city.stateName,
                countryId: city.countryId,
                countryName: city.countryName 
            }
        },
        contact: {
            phone: req.body.phone,
            email: req.body.email
        },
        socialMedia: req.body.socialMedia
    });

    if (!company) return res.status(404).send({ message: 'The company with the given ID was not found' });
    return res.send(company);
}

/**
 * Upload and update the logo of a company
 * @param {object} req 
 * @param {object} res 
 */
const uploadCompanyLogo = async (req, res) => {

    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

    let company = await Company.findById(req.params.id);
    if (!company) return res.status(404).send({ message: 'The company with the given ID was not found' });

    const uploadResponse = await uploadCompanyFile(req.file, logoImagesFolder);
    if (uploadResponse.error){
        return res.status(400).send({ message: uploadResponse.message });
    }
    company.logo = uploadResponse;
    await company.save();

    await Post.updateMany({ 'company._id': company._id },{ $set: { 'company.logo': company.logo }});
    await Experience.updateMany({ 'company._id': company._id },{ 'company.logo': company.logo });
    await Item.updateMany({ 'company._id': company._id },{ 'company.logo': company.logo });

    return res.send(company);
}

/**
 * Upload and update the cover image of a company
 * @param {object} req 
 * @param {object} res 
 */
const uploadCompanyCoverImage = async (req, res) => {

    if (!req.file) return res.status(400).send('No file uploaded');

    let company = await Company.findById(req.params.id);
    if (!company) return res.status(404).send({ message: 'The company with the given ID was not found' });

    const uploadResponse = await uploadCompanyFile(req.file, coverImagesFolder);
    company.coverPicture = uploadResponse;
    await company.save();

    await Post.updateMany({ 'company._id': company._id },{ $set: { 'company.coverPicture': company.coverPicture }});
    await Experience.updateMany({ 'company._id': company._id },{ 'company.coverPicture': company.coverPicture });
    await Item.updateMany({ 'company._id': company._id },{ 'company.coverPicture': company.coverPicture });

    return res.send(company);
}

/**
 * Upload a file to the files server
 * @param {file} file 
 * @param {string} folder 
 */
async function uploadCompanyFile (file, folder){
    const FileHandling = require('../services/fileHandling');
    const fileHandling = new FileHandling(file);
    const fileName = new Date().getTime();
    const uploadResponse = await fileHandling.saveFile(folder, fileName, ['image/png','image/jpg','image/jpeg'], ['xs', 'md']);
    return uploadResponse;
}

router.get('/', auth, asyncMiddleware(getAllCompanies));
router.get('/:id', auth, asyncMiddleware(getOneCompany));
router.post('/', [auth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'cover', maxCount: 1 }])], asyncMiddleware(createCompany));
router.post('/:id/review', auth, asyncMiddleware(createReview));
router.put('/:company/activate', auth, asyncMiddleware(activateCompany));
router.put('/:id', auth, asyncMiddleware(updateCompany));
router.put('/:id/logo', [auth, upload.single('logo')], asyncMiddleware(uploadCompanyLogo));
router.put('/:id/cover', [auth, upload.single('cover')], asyncMiddleware(uploadCompanyCoverImage));

module.exports = router;