const nodemailer = require('nodemailer');
const config = require('config');
    
exports.sendMail = async (mailOptions) => {

    try {
        const transporter = nodemailer.createTransport({
            host: config.get('email.host'),
            port: config.get('email.port'),
            secure: true, // use SSL
            auth: {
                user: config.get('email.auth.user'),
                pass: config.get('email.auth.pass')
            }
        });
          
        let sent = await transporter.sendMail(mailOptions);
        if (sent){
            if (sent.accepted.length > 0){
                return { error: false, message: sent.response }; 
            }
        }
        return { error: true, message: 'Email not sent' };
        
    } catch (error) {
        return { error: true, message: 'Email not sent' };
    }
    
}