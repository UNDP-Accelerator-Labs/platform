

const crypto = require('crypto');
const moment = require('moment')
const sendEmail = require('../helpers').email
const {  DB } = include('config/')
const { datastructures } = include('routes/helpers/')

 // Function to generate a random token
function generateToken() {
  return crypto.randomBytes(20).toString('hex');
}
 // Function to send password reset email
async function sendResetEmail(email, html) {
    let kwargs = {
        from : 'no-reply@acclab-platform.org', 
        to : email, 
        subject : 'Password reset', 
        html
    }

    sendEmail(kwargs)
}

 // Generate and send password reset token
 exports.forgetPassword = async (req, res, next) => {
  const { email } = req.body;
   // Check if the provided email exists in the database
  const user = await DB.general.oneOrNone(`
    SELECT * FROM users WHERE email = $1;
  `, [email]);
   if (!user) {
    req.session.errormessage = 'Email not found.';
    res.redirect('/login');
    return;
  }
   // Generate a password reset token and save it in the database
  const token = generateToken();
  const expiryDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  // Set the expiry date to 24 hours from now
  const expiryDate = new Date(Date.now() + expiryDuration);

  await DB.general.none(`
    UPDATE users SET reset_token = $1, reset_token_expiry = $3 WHERE email = $2;
  `, [token, email, expiryDate]);

   const baseUrl = req.headers['host']; // Extracting the base URL from the 'host' header

  // Generate the password reset link with the extracted token and base URL
  const resetLink = `http://${baseUrl}/reset/${token}`;
  const html = `
  <div>
      <p>Dear User,</p>
      <br/>
      <p>We have received a request to reset your password. Please click the link below to proceed:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire on ${moment(expiryDate).format('MMMM Do YYYY, h:mm:ss a')}</p>

      <p>If you did not request a password reset, please ignore this email.</p>
      <br/>
      <p>Best regards,</p>
      <p>AccLab Global Team</p>
  </div`

  // Send the password reset email
  await sendResetEmail(email, html);

  req.session.errormessage = 'Password reset link has been successfully sent to your email. Please check your email inbox/spam to use the reset link.'

   // Redirect the user to a page indicating that the reset email has been sent
  res.redirect('/forget-password');
};


 // Reset password page
 exports.getResetToken = async (req, res, next) => {
  const { token } = req.params;
  req.session.errormessage = '';

   // Check if the token exists in the database
  const user = await DB.general.oneOrNone(`
    SELECT * FROM users WHERE reset_token = $1;
  `, [token]);
   if (!user) {
    req.session.errormessage = 'Invalid or expired token.';
    res.redirect('/login');
    return;
  }
   // Check if the token has expired
  const expiryDate = moment(user.reset_token_expiry);
  if (moment().isAfter(expiryDate)) {
    req.session.errormessage = 'Invalid or expired token.';
    res.redirect('/login');
    return;
  }
   // Render the reset password form
   const { originalUrl, path } = req || {}
   const { errormessage, successmessage } = req.session || {}
    const metadata = await datastructures.pagemetadata({ req, res })
    const data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })

    res.render('reset-password', data );
};

// Update password after reset
exports.updatePassword = async (req, res, next) => {
    const { password, confirmPassword, token } = req.body;
    req.session.errormessage = '';

    const { originalUrl, path } = req || {}
    
     // Check if the token exists in the database
    const user = await DB.general.oneOrNone(`
      SELECT * FROM users WHERE reset_token = $1;
    `, [token]);
     if (!user) {
      req.session.errormessage = 'Invalid or expired token.';
      res.redirect('/login');
      return;
    }
     // Check if the password and confirm password match
    if (password !== confirmPassword) {
      req.session.errormessage = 'Password and confirm password do not match.';
      
      const { errormessage, successmessage } = req.session || {}
      const metadata = await datastructures.pagemetadata({ req, res })

      let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })
   
       return res.render('reset-password', data );
    }

    if(!isPasswordSecure(password)){
        req.session.errormessage = 'Password must be at least 8 characters and contains at least one uppercase, lowercase, number, and special character';

        const { errormessage, successmessage } = req.session || {}
        const metadata = await datastructures.pagemetadata({ req, res })
        let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })
    
        return res.render('reset-password', data );
    }
    
     // Update the password and clear the reset token
    await DB.general.none(`
      UPDATE users SET password = CRYPT($1, password), reset_token = NULL WHERE reset_token = $2;
    `, [password, token]);
     // Redirect the user to the login page 
    res.redirect('/login');
  };


const isPasswordSecure = (password) => {
    // Check length
    if (password.length < 8) {
      return false;
    }
     // Check complexity (contains at least one uppercase, lowercase, number, and special character)
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialCharRegex = /[!@#$%^&*]/;
     if (
      !uppercaseRegex.test(password) ||
      !lowercaseRegex.test(password) ||
      !numberRegex.test(password) ||
      !specialCharRegex.test(password)
    ) {
      return false;
    }
     // Check against common passwords (optional)
    const commonPasswords = ['password', '123456', 'qwerty'];
    if (commonPasswords.includes(password)) {
      return false;
    }
     return true;
  }