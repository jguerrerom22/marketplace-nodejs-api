const {Banner} = require('./../../models/banner');
const auth = require('../../middleware/auth');
const config = require('config');
const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: config.get('tempResources') });
const router = express.Router();

const bannersPictureFolder = 'bannersPictures/';

const getAllBanners = async(req, res) => {
    const banners = await Banner.find({ 'status.name': 'active' }).select('name mediaUrl type link -_id');
    return res.send(banners);
}

const createBanner = async (req, res) => {
    const FileHandling = require('./../../services/fileHandling');
    
    if(!req.file) return res.status(400).send({ message: 'No file uploaded' });
    const fileHandling = new FileHandling(req.file);
    const fileName = new Date().getTime();
    const uploadResponse = await fileHandling.saveFile(bannersPictureFolder, fileName, ['image/png','image/jpg','image/jpeg'], []);

    const banner = new Banner({
        name: req.body.name,
        mediaUrl: uploadResponse[0].url,
        link: req.body.link,
        type: req.body.type,
        status: { name: 'active' }

    });

    await banner.save();
    return res.status(201).send(banner);
}

router.get('/', auth, getAllBanners);
router.post('/', [auth, upload.single('file')], createBanner);

module.exports = router;