const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function auth(req, res, next){
    let token = req.header('x-auth-token');
    if (!token){
        // Visitor
        const visitor = req.header('visitor-id');
        if (!visitor) return res.status(401).send({ message: 'Access denied. No token provided' });
        token = visitor;
    } 

    // Get info token
    try{
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'));

        // Validity of token 
        if (decoded.expirationDate){
            const now = new Date().getTime();
            console.log(now, decoded.expirationDate);
            
            if (now > decoded.expirationDate){
                return res.status(401).send({ message: 'Token has expired' });
            }
        }
        req.user = decoded;
        next();
    }
    catch (ex){
        res.status(400).send({ message: 'Invalid token' });
    }   
}