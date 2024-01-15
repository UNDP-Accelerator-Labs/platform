const { own_app_url, app_title_short, app_title, translations } = include('config/');
const { email: sendEmail } = include('routes/helpers/')

exports.deviceInfo = (req) => {
  const userAgent = req.headers["user-agent"];
  const useragent = require("useragent");
  const agent = useragent.parse(userAgent);

  const device = agent.device.toString();
  const os = agent.os.toString();
  const browser = agent.toAgent();
  return { device, os, browser };
};


exports.sendDeviceCode = (_kwarg) => {
  const { conn, uuid, email, name, req } = _kwarg;
  let code = 0;
  while (`${code}`.length < 6) {
    code += Math.floor(Math.random() * 1000000);
    code %= 1000000;
  }

  const resetLink = `${own_app_url}forget-password`;
  const platformName = translations['app title']?.[app_title_short]?.['en'] ?? app_title;

  // Save the code to the database
  return conn
    .none(`
      INSERT INTO device_confirmation_code (user_uuid, code, expiration_time)
      VALUES ($1, $2, NOW() + INTERVAL '10 MINUTES')`,
      [uuid, code]
    )
    .then(async () => {
      // Send the email to the user
      // TO DO: translate
      await sendEmail({
        to: email,
        subject: `[${platformName}] Device Confirmation`,
        html: `
        <div>
          <p>Dear ${name},</p>
          <br/>
          <p>We have noticed that you recently attempted to log in or update your <a href="${own_app_url}">${platformName}</a> account from a new device.
          To ensure the security of your account, we require your confirmation before adding this device to your list of trusted devices or update your record.</p>
          <p>Please confirm this device using the OTP (One Time Password) below:</p>
          <h3>${code}</h3>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you are receiving this email and did not initiate this request, your account might be compromised. Please <a href="${resetLink}">reset your password</a> or contact system administrators.</p>
          <br/>
          <p>Best regards,</p>
          <p>AccLab Global Team</p>
        </div>`,
      });
    });
};

exports.checkDevice = async (_kwarg) => {
  const { conn, req } = _kwarg;
  const { uuid } = req.session;
  const { __ucd_app, __puid, __cduid } = req.cookies;
  const device = this.deviceInfo(req);
  const { sessionID: sid } = req || {}

  return conn.oneOrNone(
    `
        SELECT * FROM trusted_devices
          WHERE user_uuid = $1
          AND device_os = $2
          AND device_browser = $3
          AND device_name = $4
          AND duuid1 = $5
          AND duuid2 = $6
          AND duuid3 = $7
          AND session_sid = $8
          AND is_trusted IS TRUE`,
    [
      uuid,
      device.os,
      device.browser,
      device.device,
      __ucd_app,
      __puid,
      __cduid,
      sid
    ],
    (d) => (d?.id ? true : false)
  );
};


exports.query = () =>`
SELECT u.uuid, u.rights, u.name, u.email, u.iso3,
COALESCE (su.undp_bureau, adm0.undp_bureau) AS bureau,

CASE WHEN u.language IN ($1:csv)
  THEN u.language
  ELSE 'en'
END AS language,

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

LEFT JOIN adm0_subunits su
  ON su.su_a3 = u.iso3
LEFT JOIN adm0
  ON adm0.adm0_a3 = u.iso3

WHERE (u.name = $2 OR u.email = $2)
  AND (u.password = CRYPT($3, u.password) OR $3 = $4)
;`