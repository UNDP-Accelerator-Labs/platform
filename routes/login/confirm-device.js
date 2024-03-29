const { DB, app_base_host, app_title } = include("config/");
const { deviceInfo, sendDeviceCode, extractPathValue } = require("./device-info");
const { sessionupdate, redirectError } = include('routes/helpers/')
const { v4: uuidv4 } = require("uuid");

exports.confirmDevice = async (req, res, next) => {
  const redirectPath = (req.query?.path ?? '').startsWith('/') ? req.query.path : null;
  const { otp } = req.body;
  const { confirm_dev_origins } = req.session;
  const { redirecturl, uuid, app } = confirm_dev_origins || {};
  const { sessionID: sid } = req || {};

  const { referer, host } = req.headers || {}
  const origin_url = extractPathValue(referer)

  const deviceGUID1 = uuidv4(); // Generate a unique GUID for the device
  const deviceGUID2 = uuidv4();
  const deviceGUID3 = uuidv4();

  req.session.errormessage = "";
  const device = deviceInfo(req);

  if(!confirm_dev_origins) return redirectError(req, res)
  DB.general
    .tx((t) => {
      return t
        .oneOrNone(
          `SELECT * FROM device_confirmation_code WHERE code = $1 AND user_uuid = $2 AND expiration_time > NOW()`,
          [otp, uuid]
        )
        .then((result) => {
          if (result) {
            // Code exists, add device info to the list of trusted devices
            return t.none(
              `
            INSERT INTO trusted_devices (user_uuid, device_name, device_os, device_browser, last_login, session_sid, duuid1, duuid2, duuid3, is_trusted)
            VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, true)`,
              [
                uuid,
                device.device,
                device.os,
                device.browser,
                sid,
                deviceGUID1,
                deviceGUID2,
                deviceGUID3,
              ]
            );
          } else {
            t.none(
              `DELETE FROM device_confirmation_code WHERE expiration_time <= NOW()`
            );
            throw new Error("Invalid OTP");
          }
        })
        .then(() => {
          return t.none(
            `DELETE FROM device_confirmation_code WHERE user_uuid = $2`,
            [otp, uuid]
          );
        })
        .then(async () => {
          //SET USER SESSION EXPIRATION TO ONE YEAR
          const sessionExpiration = new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ); // 1 year from now
          req.session.cookie.domain = app_base_host;
          req.session.cookie.expires = sessionExpiration;
          req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

          await Object.assign(req.session, {
            page_message: null,
            is_trusted: true,
            device: {
              ...device,
              is_trusted: true,
            },
            app,
            confirm_dev_origins: null,
          });
          res.cookie("__ucd_app", deviceGUID1, { expires: sessionExpiration, domain: app_base_host });
          res.cookie("__puid", deviceGUID2, { expires: sessionExpiration, domain: app_base_host });
          res.cookie("__cduid", deviceGUID3, { expires: sessionExpiration, domain: app_base_host });
          req.session.confirm_dev_origins = null;
          req.session.save(function(err) {
            if(err) console.log(' err ', err)
            return res.redirect(redirecturl)
          })
        })
        .catch((err) => {
          console.log("err ", err);
          req.session.errormessage = "Invalid OTP";
          res.redirect(`/confirm-device?path=${redirectPath ? encodeURIComponent(redirectPath) : ''}&origin=${encodeURIComponent(origin_url)}`);
        });
    })
    .catch((err) => {
      console.log("err ", err);
      req.session.errormessage = "Invalid OTP";
      res.redirect(`/confirm-device?path=${redirectPath ? encodeURIComponent(redirectPath) : ''}&origin=${encodeURIComponent(origin_url)}`);
    });
};

exports.resendCode = async (req, res, next) => {
  const redirectPath = (req.query?.path ?? '').startsWith('/') ? req.query.path : null;
  const { confirm_dev_origins } = req.session;
  const { name, email, uuid } = confirm_dev_origins || {};

  const { referer } = req.headers || {}
  const origin_url = extractPathValue(referer)

  sendDeviceCode({
    name,
    email,
    uuid,
    conn: DB.general,
    req,
  })
    .then(() => {
      req.session.errormessage = "OTP code sent successfully!";
      res.redirect(`/confirm-device?path=${redirectPath ? encodeURIComponent(redirectPath) : ''}&origin=${encodeURIComponent(origin_url)}`);
    })
    .catch((err) => {
      console.error(err)
      redirectError(req, res)
    });
};

exports.removeDevice = async (req, res) => {
  const { id } = req.body;
  const { uuid, language, is_trusted } = req.session;

  const protocol = req.protocol

  const nextUrl = new URL(
    `${protocol}://${req.get('host')}/${language}/edit/contributor?id=${uuid}`
  );
  const nextParams = new URLSearchParams(nextUrl.search);

  try {
    await DB.general.tx(async (t) => {
      if (!is_trusted)
      nextParams.set(
          "u_errormessage",
          "This action can only be authorized on trusted devices."
        );

      if (is_trusted) {
        const sid = await t.oneOrNone(
          "SELECT session_sid FROM trusted_devices WHERE id = $1 AND user_uuid = $2",
          [id, uuid],
          (d) => d.session_sid
        );

        await t.none(
          "DELETE FROM trusted_devices WHERE id = $1 AND user_uuid = $2",
          [id, uuid]
        );
        await sessionupdate({
          conn: t,
          queryValues: [sid],
          whereClause: `sid = $1`,
        });
      }
    });
    res.redirect(`${nextUrl.pathname}?${nextParams.toString()}`);
  } catch (err) {
    console.log("err ", err);
    redirectError(req, res);
  }
};
