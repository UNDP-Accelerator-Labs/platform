const { DB, own_app_url, app_title_short, app_title, translations } = include('config/');
const { email: sendEmail, removeSubdomain, datastructures, sessionupdate } = include('routes/helpers/')
const jwt = require('jsonwebtoken');
const { isPasswordSecure } = require('./password-requirement')

const createResetLink = async (protocol, host, email) => {
  const mainHost = removeSubdomain(host);
  // Generate JWT token
  const token = await jwt.sign(
    { email, action: 'password-reset' },
    process.env.APP_SECRET,
    { expiresIn: '24h', issuer: mainHost })

  return `${protocol}://${host}/reset/${token}#`;
}
exports.createResetLink = createResetLink;

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
  const { host } = req.headers || {}
  const protocol = req.protocol
  const resetLink = await createResetLink(protocol, host, email);
  const platformName = translations['app title']?.[app_title_short]?.['en'] ?? app_title;
  const html = `
  <div>
      <p>Dear User,</p>
      <br/>
      <p>We have received a request to reset your password for the <a href="${own_app_url}">${platformName}</a>.
      Please click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <br/>
      <p>Best regards,</p>
      <p>AccLab Global Team</p>
  </div`

  // Send the password reset email
  await sendEmail({
    to: email,
    subject: `[${platformName}] Password reset`,
    html,
  });

  req.session.errormessage = 'Password reset link has been successfully sent to your email. Please check your email inbox/spam to use the reset link.'

   // Redirect the user to a page indicating that the reset email has been sent
  res.redirect('/forget-password');
};

function verifyTokenFields(decoded, res) {
  const { email, action } = decoded;
  if (!email || action !== 'password-reset') {
    return false;
  }
  return true;
}

// Reset password page
exports.getResetToken = async (req, res, next) => {
  const { token } = req.params;
  req.session.errormessage = '';
  jwt.verify(token, process.env.APP_SECRET, async function(err, decoded) {
    if(decoded) {
      if (!verifyTokenFields(decoded, res)) {
        return res.status(401).send('invalid token');
      }
      // Render the reset password form
      const { originalUrl, path } = req || {}
      const { errormessage, successmessage } = req.session || {}
      const metadata = await datastructures.pagemetadata({ req, res })
      const data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })

      return res.render('reset-password', data );
    } else {
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
    if(decoded) {
      if (!verifyTokenFields(decoded, res)) {
        return res.status(401).send('invalid token');
      }
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
        if(checkPass.length){
          req.session.errormessage = checkPass;

          const { errormessage, successmessage } = req.session || {}
          const metadata = await datastructures.pagemetadata({ req, res })
          let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token })

          return res.render('reset-password', data );
        }

        // Update the password and clear the reset token
        await DB.general.none(`
          UPDATE users SET
            password = CRYPT($1, password),
            confirmed_at = COALESCE(confirmed_at, NOW()),
            confirmed = TRUE
          WHERE email = $2
        ;`, [password, decoded.email]);

        //UPDATE ALL ACTIVE SESSION
        await sessionupdate({
          conn: DB.general,
          whereClause: `sess ->> 'email' = $1`,
          queryValues: [decoded.email]
        })

        // Redirect the user to the login page
        res.redirect('/login');
    } else {
      req.session.errormessage = 'Invalid or expired token.';
      return res.redirect('/login');
    }
  });
};
