const config = require('config');
const multer  = require('multer');
const upload = multer({ dest: config.get('tempResources'), limits: { fileSize: (1024*1024*5)  }});
const auth = require('../../middleware/auth');
const asyncMiddleware = require('../../middleware/async');
const {Post} = require('../../models/post');
const {validateReview} = require('../../models/review');
const {Company} = require('../../models/company');
const {User} = require('../../models/user');
const {Item} = require('../../models/item');
const express = require('express');
const router = express.Router();

const postsMediaFolder = 'postsMedia/';

/**
 * Get all the posts
 * @param {object} req 
 * @param {object} res 
 */
const getHomePosts = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const sortBy = req.query.sortBy ? req.query.sortBy : '-createdAt';
    
    // Filters
    let filters = { 'company.status.name': 'active' };
    if (req.query.company) filters['company._id'] = req.query.company;
    if (req.params.city) filters['company.location.city._id'] = req.params.company;

    const docs = await Post.find(filters, {
        _id: 1, description: 1, media: 1, reviews: 1, createdAt: 1, 
        'company._id': 1, 'company.stats.rating': 1, 'company.name': 1, 'company.logo': 1,
    }).populate({ 
        path: 'reviews.user',
        model: 'User',
        select: '_id firstName lastName profilePicture'
     })
    .skip(skip)
    .limit(limit)
    .sort(sortBy);

    var posts = [];
    for (var x in docs){

        let items = await Item.find({'company._id': docs[x].company._id, 'status.name': 'active'}, 
            {_id: 1, type: 1, title: 1, price: 1, description: 1, profilePicture: 1}).skip(0).limit(3);

        let mediaFiles = [];
        for (var y in docs[x].media){
            let mdFiles = docs[x].media[y].find(x => x.size=='md');
            if (!mdFiles) mdFiles = docs[x].media[y].find(x => x.size=='original');
            mediaFiles.push({
                url: mdFiles.url,
                type: mdFiles.type
            })
        }

        posts.push({
            companyId: docs[x].company._id,
            companyName: docs[x].company.name,
            companyLogo: docs[x].company.logo,
            postId: docs[x]._id,
            description: docs[x].description,
            createdAt: docs[x].createdAt,
            lastReview: docs[x].reviews[docs[x].reviews.length - 1],
            media: mediaFiles,
            items: items,
            rating: docs[x].company.stats.rating
        });
    }
    return res.send(posts);
}

/**
 * Get the post who the user follows. For VID section
 * @param {object} req 
 * @param {object} res 
 */
const getVIDPosts = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const sortBy = req.query.sortBy ? req.query.sortBy : '-createdAt';
    
    let docs = await Post.find({
        $or: [{'company.status.name': 'active'}, { 'user.status.name': 'active' }],
        $or: [{'company.followers': req.user._id}, { 'user.followers': req.user._id }],
    }, {
        _id: 1, description: 1, media: 1, reviews: 1, createdAt: 1, user: 1,
        'company._id': 1, 'company.stats.rating': 1, 'company.name': 1, 'company.logo': 1,
        'user._id': 1, 'user.firstName': 1, 'user.lastName': 1, 'user.profilePicture': 1
    })
    .populate({ 
        path: 'reviews.user',
        model: 'User',
        select: '_id firstName lastName profilePicture'
    })
    .skip(skip)
    .limit(limit)
    .sort(sortBy);

    docs = docs.filter(x => x.user != null || x.company != null);
    var posts = [];
    for (var x in docs){

        // Prepare the media files
        let mediaFiles = [];
        for (var y in docs[x].media){
            let mdFiles = docs[x].media[y].find(x => x.size == 'md' || x.size == 'original');
            mediaFiles.push({
                url: mdFiles.url,
                type: mdFiles.type
            });
        }
        
        let data = {
            postId: docs[x]._id,
            user: docs[x].user,
            company: docs[x].company,
            description: docs[x].description,
            createdAt: docs[x].createdAt,
            lastReview: docs[x].reviews[docs[x].reviews.length - 1],
            media: mediaFiles
        };

        posts.push(data);
    }
    return res.send(posts);
}

/**
 * Get detail of a Post
 * @param {object} req 
 * @param {object} res 
 */
const getOnePost = async (req, res) => {
    
    const post = await Post.findById(req.params.id, {
        _id: 1, 'description': 1, createdAt: 1, media: 1, 
        'company._id': 1, 'company.name': 1, 'company.logo': 1, 'company.coverImage': 1, 
        'user._id': 1, 'user.firstName': 1, 'user.lastName': 1, 'user.profilePicture': 1,
        'reviews.date': 1, 'reviews.comment': 1, 'reviews.user': 1
    })
    .populate({ 
        path: 'reviews.user',
        model: 'User',
        select: '_id firstName lastName profilePicture'
    });
    if (!post) return res.status(404).send({ message: 'The post with the given ID was not found.' });

    let mediaFiles = [];
    for (var y in post.media){
        let mdFiles = post.media[y].find(x => x.size == 'md' || x.size == 'original');
        mediaFiles.push({
            url: mdFiles.url,
            type: mdFiles.type
        });
    }
    
    let data = {
        id: post._id,
        description: post.description,
        createdAt: post.createdAt,
        reviews: post.reviews,
        media: mediaFiles,
        user: post.user,
        company: post.company
    };
    return res.send(data);
}

/**
 * Create a post
 * @param {object} req 
 * @param {object} res 
 */
const createPost = async (req, res) => {
    
    const FileHandling = require('../../services/fileHandling');

    if (!req.files) return res.status(400).send({ message: 'Media is required.' });
    
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
    
    // Upload media files
    var media = [];
    var mediaReturn = [];
    for (let x in req.files){
        let file = req.files[x];
        let fileHandling = new FileHandling(file);
        let fileName = new Date().getTime();
        let isVideo = (file.mimetype == 'video/mp4'); 
        let sizes = (isVideo) ? [] : ['md'];
        let uploadResponse = await fileHandling.saveFile(postsMediaFolder, fileName, ['image/png','image/jpg','image/jpeg', 'video/mp4'], sizes);
        let mdFile = (isVideo) ? uploadResponse.find(x => x.size=='original') : uploadResponse.find(x => x.size=='md');
        mediaReturn.push({ url: mdFile.url, type: mdFile.type });
        media.push(uploadResponse);
    }

    const r = req.body;
    let data = {
        description: r.description,
        createdAt: Date.now(),
        createdBy: req.user._id,
        media: media,
        reviews: []
    };
    if (companyInfo !== null) data.company = companyInfo;
    if (userInfo !== null) data.user = userInfo;

    const post = new Post(data);
    await post.save();

    data.media = mediaReturn;
    return res.send(data);
}

/**
 * Create a review of post
 * @param {object} req 
 * @param {object} res 
 */
const createReview = async (req, res) => {
    const { error } = validateReview(req.body); 
    if (error) return res.status(400).send({ message: error.details[0].message });
               
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(400).send({ message: 'Invalid post.' });

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
    post.reviews.push(review);

    await post.save();
    return res.send(review);
}

const updatePost = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(400).send({ message: 'Invalid user.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(400).send({ message: 'Invalid post.' });

    if (!req.body.description){
        return res.status(400).send({ message: 'Invalid description.' });
    }

    post.description = req.body.description;
    await post.save();

    return res.send({
        id: post._id,
        media: post.media,
        description: post.description
    });
}

router.get('/', auth, asyncMiddleware(getHomePosts));
router.get('/vid', auth, asyncMiddleware(getVIDPosts));
router.get('/:id', auth, asyncMiddleware(getOnePost));
router.post('/', [auth, upload.array('media', 3)], asyncMiddleware(createPost));
router.post('/:id/review', auth, asyncMiddleware(createReview));
router.put('/:id', auth, updatePost);

module.exports = router;