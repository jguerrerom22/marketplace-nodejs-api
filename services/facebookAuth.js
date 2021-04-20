const config = require('config');
//onst logging = require('../startup/logging');
const fetch = require('node-fetch');

const clientId = config.get('facebook.clientId');
const clientSecret = config.get('facebook.clientSecret');

module.exports.getFacebookUser = (code) => {

    //let url = 'https://graph.facebook.com/oauth/access_token?client_id=' + clientId + '&client_secret=' + clientSecret + '&grant_type=client_credentials';
    let url = 'https://graph.facebook.com/v4.0/me?access_token=' + code + '&fields=id,name,picture,email,hometown,last_name,location,first_name';
    
    return fetch( url, { method: 'GET' } )
        .then(response => response.json() )
        .then(response => {
            if (response.error){
                return returnError(response.error, 'Facebook auth: ' + response.error.message);
            }    
            let user = {
                id: response.id,
                firstName: response.first_name,
                lastName: response.last_name,
                profilePicture: response.picture.data.url,
                email: response.email
            }
            return user;
        })
        .catch( err => {
            return returnError(err, 'Error while authenticating facebook user');
        });
}

function returnError(err, message){
    console.error(err.message, err);
    return { error: true, message: message };
}