const { DB, app_languages, modules } = include("config/");
const { datastructures } = include("routes/helpers/");
const deviceInfo = require("./device-info").deviceInfo;
const sendDeviceCode = require("./device-info").sendDeviceCode;

exports.confirmDevice = async (req, res, next) => {
  const { otp, is_trusted } = req.body;
  const { confirm_dev_origins } = req.session;

  const { redirectPath, path, referer, originalUrl, uuid } =
    confirm_dev_origins || {};
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
        if (result && is_trusted === "on") {
          // Code exists, add device info to the list of trusted devices
          return t.none(
            `
              INSERT INTO trusted_devices (user_uuid, device_name, device_os, device_browser, last_login, is_trusted)
              VALUES ($1, $2, $3, $4, $5,true)`,
            [uuid, device.device, device.os, device.browser, new Date()]
          );
        } else if (result) {
          return result;
        } else throw new Error("Invalid code");
      })
      .then(() => {
        DB.general.oneOrNone(
          `DELETE FROM device_confirmation_code WHERE code = $1 AND user_uuid = $2`,
          [otp, uuid]
        );
      })
      .then(() => {
        // Code exists and device info added to trusted devices
        return t
          .oneOrNone(
            `
          SELECT u.uuid, u.rights, u.name, u.email, u.iso3, c.lng, c.lat, c.bureau,
          CASE WHEN u.language IN ($1:csv)
            THEN u.language
            ELSE 'en'
          END AS language,
          CASE WHEN u.language IN ($1:csv)
            THEN (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = u.language)
            ELSE (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = 'en')
          END AS countryname,
          COALESCE(
            (SELECT json_agg(DISTINCT(jsonb_build_object(
              'uuid', u2.uuid,
              'name', u2.name,
              'rights', u2.rights
            ))) FROM team_members tm
            INNER JOIN teams t
              ON t.id = tm.team
            INNER JOIN users u2
              ON u2.uuid = tm.member
            WHERE t.id IN (SELECT team FROM team_members WHERE member = u.uuid)
          )::TEXT, '[]')::JSONB
          AS collaborators
          FROM users u
          INNER JOIN countries c
            ON u.iso3 = c.iso3
          WHERE u.uuid = $2
              ;`,
            [app_languages, uuid]
          )
          .then((result) => {
            const { language, rights } = result;

            Object.assign(req.session, datastructures.sessiondata(result));
            if (redirectPath && !redirectPath.include("/login")) {
              res.redirect(`${redirectPath}`);
            } else if (!originalUrl || originalUrl === path) {
              const { read, write } = modules.find(
                (d) => d.type === "pads"
              )?.rights;
              if (rights >= (write ?? Infinity))
                res.redirect(`/${language}/browse/pads/private`);
              else if (rights >= (read ?? Infinity))
                res.redirect(`/${language}/browse/pads/shared`);
              else res.redirect(`/${language}/browse/pads/public`);
            } else if (
              !referer.include("/login") &&
              !originalUrl.include("/login")
            ) {
              res.redirect(originalUrl || referer);
            } else res.redirect(`/${language}/browse/pads/public`);
            req.session.confirm_dev_origins = null;
          })
          .catch((err) => {
            req.session.errormessage = "Invalid OTP";
            res.redirect("/confirm-device");
          });
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
    const { referer } = req.headers || {}
    const { uuid, language } = req.session

    DB.general.oneOrNone(`
        DELETE FROM trusted_devices WHERE id = $1 AND user_uuid = $2
    `, [id, uuid])
    .then(()=> {
        res.redirect(referer || `/${language}/edit/contributor?id=${uuid}`)
    })
    .catch((err)=>{
        res.redirect('/module-error')
    })
}