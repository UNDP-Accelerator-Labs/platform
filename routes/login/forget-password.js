const sendEmail = require('../helpers').email
const {  DB } = include('config/')
const { datastructures } = include('routes/helpers/')
const jwt = require('jsonwebtoken');

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
  const token = await jwt.sign({ email }, process.env.APP_SECRET, { expiresIn: '24h' } )

   const baseUrl = req.headers['host']; // Extracting the base URL from the 'host' header

  // Generate the password reset link with the extracted token and base URL
  const resetLink = `https://${baseUrl}/reset/${token}`;
  const html = `
  <div>
      <p>Dear User,</p>
      <br/>
      <p>We have received a request to reset your password. Please click the link below to proceed:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 24 hours.</p>

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

 jwt.verify(token, process.env.APP_SECRET, async function(err, decoded) {
    if(decoded){
      // Render the reset password form
      const { originalUrl, path } = req || {}
      const { errormessage, successmessage } = req.session || {}
      const metadata = await datastructures.pagemetadata({ req, res })
      const data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })

      return res.render('reset-password', data );
    }
    else {
      req.session.errormessage = 'Invalid or expired token.';
      return res.redirect('/login');
      
    }
  });

};

// Update password after reset
exports.updatePassword = async (req, res, next) => {
    const { password, confirmPassword, token } = req.body;
    req.session.errormessage = '';

    const { originalUrl, path } = req || {}

    jwt.verify(token, process.env.APP_SECRET, async function(err, decoded) {
      if(decoded){

        const { originalUrl, path } = req || {}
         // Check if the password and confirm password match
          if (password !== confirmPassword) {
            req.session.errormessage = 'Password and confirm password do not match.';
            
            const { errormessage, successmessage } = req.session || {}
            const metadata = await datastructures.pagemetadata({ req, res })

            let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })
        
            return res.render('reset-password', data );
          }

          let checkPass = isPasswordSecure(password)
          if(!checkPass?.isValid){
              req.session.errormessage = checkPass.message;
      
              const { errormessage, successmessage } = req.session || {}
              const metadata = await datastructures.pagemetadata({ req, res })
              let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })
          
              return res.render('reset-password', data );
          }

          // Update the password and clear the reset token
            await DB.general.none(`
            UPDATE users SET password = CRYPT($1, password) WHERE email = $2;
          `, [password, decoded?.email]);
          // Redirect the user to the login page 
          res.redirect('/login');
          
      }
      else {
        req.session.errormessage = 'Invalid or expired token.';
        return res.redirect('/login');
        
      }
    });
    
  };


const isPasswordSecure = (password) => {
    // Check length
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters.'
      };
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
      return {
        isValid: false,
        message: 'Password must contains at least one uppercase, lowercase, number, and special character.'
      };
    }
     // Check against common passwords (optional)
    const commonPasswords = ['password', '123456', 'qwerty'];
    if (commonPasswords.includes(password)) {
      return {
        isValid: false,
        message: 'Your password failed check against common and easy passwords.'
      };
    }
     return {
      isValid: true,
      message: 'Password updated successfully!'
    };
  }