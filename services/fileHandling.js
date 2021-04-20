const config = require('config');
const { Storage } = require('@google-cloud/storage');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const fs = require('fs');

module.exports = function (file) {

    this.file = file;
    this.projectId = config.get('google.projectId');
    this.bucketId = config.get('google.bucketId');
    this.keyFile = config.get('google.serviceAccountKey');

    /**
     * Upload a file to google coud storage
     * @param {string} filePath Path of the file to upload
     * @param {string} fileName Name of the file to upload
     * @param {string} folderName Name of the folder in the location of target
     */
    this.uploadFile = async function(filePath, fileName, folderName){
        
        const gcs = new Storage({
            projectId: this.projectId,
            keyFilename: this.keyFile
        });
        const bucket = gcs.bucket(this.bucketId);

        const uuid = uuidv4();
        return bucket.upload(filePath, {
            destination: folderName + fileName,
            uploadType: "media",
            metadata: {
                contentType: mime.lookup(filePath),
                metadata: {
                    firebaseStorageDownloadTokens: uuid
                }
            }
        })
        .then((data) => {
            const responseFile = data[0];
            const uploadedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(responseFile.name)}?alt=media&token=${uuid}`;
            return Promise.resolve({ error: false, uploadedUrl: uploadedUrl });
        }).catch((err) => {
            console.log('Error uploading image on cloud: ', err);
            return Promise.resolve({ error: true, message: 'Invalid file.', detailMessage: err.message });
        });
    }

    /**
     * Resize and save the file to server
     * @param {string} folderName Name of the folder of file in targe
     * @param {string} fileName Name of the target file
     * @param {array} formats List of accepted format of file
     * @param {array} sizes Name of sizes of the file to resize
     */
    this.saveFile = async function(folderName, fileName, formats, sizes){

        try {
            if (formats.includes(this.file.mimetype)){

                const fileExtension = getFileExtension(this.file.mimetype);
                var storedFiles = [];
                
                if (sizes && sizes.length > 0){
                    for (var x in sizes){
                        const size = sizes[x];
                        const dimensions = getSizeImage(size);
                        const width = dimensions[0];
                        const height = dimensions[0];

                        let resizedFileName = fileName + '_' + size + fileExtension;
                        let resizedFilePath = config.get('tempResources') + resizedFileName;
                        
                        await sharp(this.file.path)
                            .resize(width, height)
                            .toFile(resizedFilePath);

                        await this.uploadFile(resizedFilePath, resizedFileName, folderName).then( downloadURL => {
                            if (downloadURL['error'] == false) 
                                storedFiles.push({
                                    size: size, 
                                    url: downloadURL['uploadedUrl'],
                                    type: fileExtension.replace('.','')
                                });
                        });
                        fs.unlinkSync(resizedFilePath);
                    }
                } 
                fileName = fileName + fileExtension;
                
                await this.uploadFile(this.file.path, fileName, folderName).then( downloadURL => {
                    if (downloadURL['error'] == false) 
                        storedFiles.push({
                            size: 'original', 
                            url: downloadURL['uploadedUrl'],
                            type: fileExtension.replace('.','')
                        });
                });
                fs.unlinkSync(this.file.path);
                return storedFiles;
            } 
            return { error: true, message: 'Incorrect type of file.' };

        } catch (error) {
            return { error: true, message: 'Error on file.', detailMessage: error.message };
        }
    }
};

/**
 * Get the dimension of size name picture [width, height]
 * @param {string} size 
 */
function getSizeImage(size){
    switch (size){
        case 'xs': return [50,50];
        case 'md': return [500,500];
        case 'xl': return [1200,900];
        default: return [500,500];
    }
}

/**
 * Get the name of format of file
 * @param {string} mimetype 
 */
function getFileExtension(mimetype){
    const parts = mimetype.split('/');
    return '.' + parts[parts.length -1];
}