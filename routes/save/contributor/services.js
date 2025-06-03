const jwt = require("jsonwebtoken");
const { email: sendEmail, sessionupdate, removeSubdomain, redirectUnauthorized } = include("routes/helpers/");
const { DB, own_app_url, app_title, app_title_short, translations, base_host } = include("config/");

exports.confirmEmail = async (_kwarg) => {
  let { uuid, email, name, old_email, req, fromBaseHost } = _kwarg;

  fromBaseHost = fromBaseHost === true || fromBaseHost === 'true';

  let { host } = req.headers || {};
  const mainHost = removeSubdomain(host);
  const protocol = req.protocol;
  if (fromBaseHost) {
    host = base_host;
  }

  const token = await jwt.sign(
    { email, uuid, name, old_email, action: "confirm-email" },
    process.env.APP_SECRET,
    { expiresIn: "1h", issuer: mainHost }
  );

  const confirmationLink = `${protocol}://${host}/confirm-email/${token}#`;
  const platformName = fromBaseHost ? 'SDG Commons' : translations['app title']?.[app_title_short]?.['en'] ?? app_title;

  // Send the email to the user
  // TO DO: translate
  return await sendEmail({
    to: email,
    subject: `[${platformName}] Email Address Confirmation`,
    html: `
            <div>
              <p>Dear ${name},</p>
              <br/>
              <p>We have noticed that you recently attempted to change your email address on the <a href="${own_app_url}">${platformName}</a>.</p>
              <p>To confirm your new email address, please click on the link below or confirm your email address:</p>
              <a href="${confirmationLink}">${confirmationLink}</a>
              <br/>
              <p>This link expires in 1 hour. If you did not initiate this change, please ignore this email or contact our support team.</p>
              <br/>
              <p>Best regards,</p>
              <p>AccLab Global Team</p>
            </div>`,
  });
};

exports.updateRecord = (_kwarq) => {
  const { data, conn } = _kwarq;
  return conn.none(
    `
      UPDATE users
      SET name = $1,
          position = $3,
          $4:raw
          iso3 = $5,
          language = $6,
          secondary_languages = $7,
          $8:raw
          notifications = $9,
          reviewer = $10,
          confirmed_at = COALESCE(confirmed_at, NOW()),
          confirmed = TRUE
      WHERE uuid = $11
      ;`,
    data
  );
};

function verifyTokenFields(decoded, res) {
  const { email, action, uuid, name } = decoded;
  if (!email || !uuid || !name || action !== "confirm-email") {
    return false;
  }
  return true;
}

exports.updateNewEmail = async (req, res, next) => {
  const { token } = req.params;
  let { is_api_call } = req.query || {};
  const { referer } = req.headers || {}

  is_api_call = is_api_call === 'true' || is_api_call === true;

  req.session.errormessage = "";
  jwt.verify(token, process.env.APP_SECRET, async function (err, decoded) {
    if (decoded) {
      if (!verifyTokenFields(decoded, res)) {
        if (is_api_call) {
          return res.status(401).json({
            status: 401,
            message: "Invalid token fields",
          });
        }
        return res.status(401).send("invalid token");
      }
      const { email, action, uuid, name, old_email } = decoded;
      let errormessage = "";

      await DB.general
        .tx(async (t) => {
          await t.none(
            `
            UPDATE users
            SET email = $1
            WHERE uuid = $2
        `,
            [email, uuid]
          );
          await sessionupdate({
            conn: t,
            queryValues: [uuid],
            whereClause: `sess ->> 'uuid' = $1`,
          });
        })
        .then(async () => {
          const platformName = is_api_call ? 'SDG Commons' : translations['app title']?.[app_title_short]?.['en'] ?? app_title;
          await sendEmail({
            to: old_email,
            subject: `[${platformName}] Email Address Update Notification`,
            html: `
                    <div>
                      <p>Dear ${name},</p>
                      <br/>
                      <p>We are writing to inform you that your email address has been updated for the <a href="${own_app_url}">${platformName}</a>.</p>
                      <p>If you made this change, please disregard this notification.</p>
                      <p>However, if you did not authorize this change, please contact our support team immediately.</p>
                      <br/>
                      <p>Best regards,</p>
                      <p>AccLab Global Team</p>
                    </div>`,
          });
        })
        .catch((err) => {
          console.log(err)
          errormessage = "Error updating email address. Please try again later.";
        })

      if (errormessage) {
        req.session.errormessage = errormessage;
        if (is_api_call) {
          return res.status(500).json({
            status: 500,
            message: errormessage,
          });
        }
        return redirectUnauthorized(req, res);
      }

        req.session.errormessage = 'Email changed successful.'

      if(req.session.uuid === uuid){
        req.session.destroy()
        if (is_api_call) {
          return res.status(200).json({
            status: 200,
            success: true,
            message: "Email changed successfully. Please log in again.",
          });
        }
        return redirectUnauthorized(req, res);
      }
      else {
        if (is_api_call) {
          return res.status(200).json({
            status: 200,
            success: true,
            message: "Email changed successfully.",
          });
        }
        // If the user is not logged in, redirect to the referer or home page
        res.render(referer || '/');
      }
    } else {
      req.session.errormessage = "Invalid or expired token.";
      if (is_api_call) {
        return res.status(401).json({
          status: 401,
          message: "Invalid or expired token.",
        });
      }
      return redirectUnauthorized(req, res);
    }
  });
};
