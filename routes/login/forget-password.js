const { DB, own_app_url, app_title_short, app_title, translations, base_host, app_suite_url } = include('config/');
const { email: sendEmail, removeSubdomain, datastructures, sessionupdate, redirectUnauthorized } = include('routes/helpers/')
const jwt = require('jsonwebtoken');
const { isPasswordSecure } = require('./password-requirement')
const { extractPathValue } = require('./device-info');
const { is } = require('useragent');

const createResetLink = async (protocol, host, email, origin= '' ) => {
  const mainHost = removeSubdomain(host);

  // Generate JWT token
  const token = await jwt.sign(
    { email, action: 'password-reset', origin: origin ? extractPathValue(origin) : '' },
    process.env.APP_SECRET,
    { expiresIn: '24h', issuer: mainHost })

  return `${protocol}://${host}/reset/${token}#`;
}
exports.createResetLink = createResetLink;

// Generate and send password reset token
exports.forgetPassword = async (req, res, next) => {
  const redirectPath = (req.query?.path ?? '').startsWith('/') ? req.query.path : null;
  let { email, fromBase= false } = req.body;
  fromBase = fromBase === true || fromBase === 'true';
   // Check if the provided email exists in the database
  const user = await DB.general.oneOrNone(`
    SELECT * FROM users WHERE email = $1;
  `, [email]);
   if (!user) {
    req.session.errormessage = 'Email not found.';
    if(fromBase) {
      res.status(404).json({ status: 404, message: 'If the user is found, a reset link will be sent to their email with instructions on how to reset their password.' });
      return
    }
    redirectUnauthorized(req, res)
    return;
  }
  let { host, referer } = req.headers || {}

  if(fromBase) {
    host = base_host
  }
  let protocol = req.protocol
  const resetLink = await createResetLink(protocol, host, email, referer);
  let platformName = fromBase ? 'SDG Commons' : translations['app title']?.[app_title_short]?.['en'] ?? app_title;
  const html = `
  <div>
      <p>Dear User,</p>
      <br/>
      <p>We have received a request to reset your password for the <a href="${fromBase ? app_suite_url : own_app_url}">${platformName}</a>.
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

  if(fromBase) {
    res.status(200).json({ status: 200, message: 'Password reset link has been successfully sent to your email. Please check your email inbox/spam to use the reset link.' });
    return
  }
   // Redirect the user to a page indicating that the reset email has been sent
  res.redirect(`/forget-password?path=${redirectPath ? encodeURIComponent(redirectPath) : ''}`);
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
  const redirectPath = (req.query?.path ?? '').startsWith('/') ? req.query.path : null;
  const { token } = req.params;
  const { originalUrl, path } = req || {}
  req.session.errormessage = '';
  jwt.verify(token, process.env.APP_SECRET, async function(err, decoded) {
    if(decoded) {
      if (!verifyTokenFields(decoded, res)) {
        if(originalUrl.includes(base_host)) {
          return res.status(401).json({ status: 401, message: 'Invalid token' });
        }

        return res.status(401).send('invalid token');
      }
      // Render the reset password form
      const { errormessage, successmessage } = req.session || {}
      const metadata = await datastructures.pagemetadata({ req, res })
      const data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token, redirectPath: redirectPath ? encodeURIComponent(redirectPath) : undefined })

      if(originalUrl.includes(base_host)) {
        return res.status(200).json({ status: 200, message: 'Reset token is valid', data });
      } 
      // Render the reset password page
      return res.render('reset-password', data );
    } else {
      req.session.errormessage = 'Invalid or expired token.';
      return redirectUnauthorized(req, res);
    }
  });
};

// Update password after reset
exports.updatePassword = async (req, res, next) => {
  const redirectPath = (req.query?.path ?? '').startsWith('/') ? req.query.path : null;
  let { password, confirmPassword, token, is_api_call } = req.body;
  req.session.errormessage = '';
  is_api_call = is_api_call === 'true' || is_api_call === true;

  const { originalUrl, path } = req || {}

  jwt.verify(token, process.env.APP_SECRET, async function(err, decoded) {
    if(decoded) {
      if (!verifyTokenFields(decoded, res)) {
        if(is_api_call) {
          return res.status(401).json({ status: 401, message: 'Invalid token' });
        }

        return res.status(401).send('invalid token');
      }
        // Check if the password and confirm password match
        if (password !== confirmPassword) {
          req.session.errormessage = 'Password and confirm password do not match.';

          if(is_api_call) {
            return res.status(400).json({ status: 400, message: 'Password and confirm password do not match.' });
          }

          const { errormessage, successmessage } = req.session || {}
          const metadata = await datastructures.pagemetadata({ req, res })

          let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token, redirectPath: redirectPath ? encodeURIComponent(redirectPath) : undefined })

          return res.render('reset-password', data );
        }

        let checkPass = isPasswordSecure(password)
        if(checkPass.length){
          req.session.errormessage = checkPass;
          if(is_api_call) {
            return res.status(400).json({ status: 400, message: checkPass });
          }

          const { errormessage, successmessage } = req.session || {}
          const metadata = await datastructures.pagemetadata({ req, res })
          let data = Object.assign(metadata, { originalUrl, errormessage, successmessage, token, redirectPath: redirectPath ? encodeURIComponent(redirectPath) : undefined })

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

        if(is_api_call) {
          return res.status(200).json({ status: 200, message: 'Password has been successfully updated.' });
        }
        
        // Redirect the user to the login page
        redirectUnauthorized(req, res)
    } else {
      req.session.errormessage = 'Invalid or expired token.';
      return redirectUnauthorized(req, res);
    }
  });
};
