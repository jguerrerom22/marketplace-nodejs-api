const config = require( 'config' );
const logging = require('../startup/logging');
const { OAuth2Client } = require( 'google-auth-library' );

const GOOGLE_CLIENT_ID = config.get('google.clientId');
var client = new OAuth2Client( GOOGLE_CLIENT_ID, '', '' );

//return a promise with user informations
module.exports.getGoogleUser = (code) => {
    //verify the token using google client
    return client.verifyIdToken( { idToken: code, audience: GOOGLE_CLIENT_ID } )
        .then( login => {
            
            //if verification is ok, google returns a jwt
            var payload = login.getPayload();
            var userid = payload['sub'];

            //check if the jwt is issued for our client
            var audience = payload.aud;
            if ( audience !== GOOGLE_CLIENT_ID ) {
                const errMessage = 'error while authenticating google user: audience mismatch: wanted [' + GOOGLE_CLIENT_ID + '] but was [' + audience + ']';
                return returnError(new Error(errMessage), 'Error while authenticating google user: audience mismatch')
            }
            
            //promise the creation of a user
            return {
                firstName: payload['given_name'], //profile name
                lastName: payload['family_name'], //profile name
                pic: payload['picture'], //profile pic
                id: payload['sub'], //google id
                emailVerified: payload['email_verified'], 
                email: payload['email']
            }
        })
        .then(user => { return user; })
        .catch(err => {
            //throw an error if something gos wrong
            return returnError(err, 'Error while authenticating google user');
        })
}

function returnError(err, message){
    //logging.error(err.message, err);
    return { error: true, message: message };
}