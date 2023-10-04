const { DB } = include("config/");
const { deviceInfo, sendDeviceCode } = require("./device-info");
const { updateRecord } = include("routes/save/contributor/confirm-device");


exports.confirmDevice = async (req, res, next) => {
  const { otp } = req.body;
  const { confirm_dev_origins } = req.session;
  const { redirecturl, uuid, u_profile } = confirm_dev_origins || {};
  const { sessionID: sid } = req || {};

  req.session.errormessage = "";
  const device = deviceInfo(req);
  DB.general.tx((t) => {
    return t
      .oneOrNone(
        `
            SELECT * FROM device_confirmation_code WHERE code = $1 AND user_uuid = $2`,
        [otp, uuid]
      )
      .then((result) => {
        if (result) {
          if (u_profile) {
            updateRecord({
              conn: t,
              data: u_profile,
            }).catch((err) => console.log(err));
          }
          // Code exists, add device info to the list of trusted devices
          return t.none(
            `
                  INSERT INTO trusted_devices (user_uuid, device_name, device_os, device_browser, last_login, session_sid, is_trusted)
                  VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [uuid, device.device, device.os, device.browser, new Date(), sid]
          );
        } else {
          throw new Error("Invalid OTP");
        }
      })
      .then(() => {
        return t.none(
          `
              DELETE FROM device_confirmation_code WHERE code = $1 AND user_uuid = $2`,
          [otp, uuid]
        );
      })
      .then(async () => {
        //LOG OUT USER EVERYWHERE WHEN USER CHANGES PASSWORD
        if (u_profile?.[3].length) {

          await t.none(`
						UPDATE trusted_devices
						SET session_sid = NULL
						WHERE session_sid IN (
							SELECT sid
							FROM session
							WHERE sess ->> 'uuid' = $1
						);
						`, [uuid]);
					await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1;`, [uuid])

          req.session.destroy();
          res.redirect("/login");
        } else {
          const sessionExpiration = new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ); // 1 year from now
          req.session.cookie.expires = sessionExpiration;
          req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
          res.redirect(redirecturl);
          req.session.confirm_dev_origins = null;
        }
      })
      .catch((err) => {
        req.session.errormessage = "Invalid OTP";
        res.redirect("/confirm-device");
      });
  });
};

exports.resendCode = async (req, res, next) => {
  const { confirm_dev_origins } = req.session;

  const { name, email, uuid } = confirm_dev_origins || {};
  sendDeviceCode({
    name,
    email,
    uuid,
    conn: DB.general,
  })
    .then(() => {
      req.session.errormessage = "OTP code sent successfully!";
      res.redirect("/confirm-device");
    })
    .catch((err) => res.redirect("/module-error"));
};

exports.removeDevice = async (req, res) => {
  const { id } = req.body;
  const { referer } = req.headers || {};
  const { uuid, language } = req.session;

  DB.general
    .oneOrNone(
      `
        DELETE FROM trusted_devices WHERE id = $1 AND user_uuid = $2
    `,
      [id, uuid]
    )
    .then(() => {
      res.redirect(referer || `/${language}/edit/contributor?id=${uuid}`);
    })
    .catch((err) => {
      res.redirect("/module-error");
    });
};
