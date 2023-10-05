const { DB } = include("config/");
const { deviceInfo, sendDeviceCode, checkDevice } = require("./device-info");
const { updateRecord } = include("routes/save/contributor/confirm-device");
const { v4: uuidv4 } = require('uuid');

exports.confirmDevice = async (req, res, next) => {
  const { otp } = req.body;
  const { confirm_dev_origins } = req.session;
  const { redirecturl, uuid, u_profile } = confirm_dev_origins || {};
  const { sessionID: sid } = req || {};

  const deviceGUID1 = uuidv4(); // Generate a unique GUID for the device
  const deviceGUID2 = uuidv4();
  const deviceGUID3 = uuidv4();

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
                  INSERT INTO trusted_devices (user_uuid, device_name, device_os, device_browser, last_login, session_sid, duuid1, duuid2, duuid3, is_trusted)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
            [uuid, device.device, device.os, device.browser, new Date(), sid, deviceGUID1, deviceGUID2, deviceGUID3]
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
          //SET USER SESSION EXPIRATION TO ONE YEAR
          const sessionExpiration = new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ); // 1 year from now
          req.session.cookie.expires = sessionExpiration;
          req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
          
          req.session.page_message = null
          req.session.device = {
            ...device,
            is_trusted : true
          }

          res.cookie('__ucd_app', deviceGUID1, { sessionExpiration }); 
          res.cookie('__puid', deviceGUID2, { sessionExpiration }); 
          res.cookie('__cduid', deviceGUID3, { sessionExpiration }); 
          
          res.redirect(redirecturl);
          req.session.confirm_dev_origins = null;
        }
      })
      .catch((err) => {
        console.log('err ', err)
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

  try {
    await DB.general.tx(async (t) => {
      //ALLOW REMOVE OF DEVICE ONLY FROM TRUSTED DEVICES
      const is_trusted = await checkDevice({req, conn: t})
      if(is_trusted){
        const sid = await t.oneOrNone('SELECT session_sid FROM trusted_devices WHERE id = $1 AND user_uuid = $2', [id, uuid], d => d.session_sid )
  
        await t.none('DELETE FROM trusted_devices WHERE id = $1 AND user_uuid = $2', [id, uuid]);
        await t.none('DELETE FROM session WHERE sid = $1', [sid]);
      }

    });
    res.redirect(referer || `/${language}/edit/contributor?id=${uuid}`);
  } catch (err) {
    console.log('err ', err)
    res.redirect("/module-error");
  }
};


