const sendEmail = require("../helpers").email;

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
  const { conn, uuid, email, name } = _kwarg;

  const code = Math.floor(Math.random() * 1000000);
  const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Save the code to the database
  return conn
    .none(
      `
        INSERT INTO device_confirmation_code (user_uuid, code, expiration_time)
        VALUES ($1, $2, $3)`,
      [uuid, code, expirationTime]
    )
    .then(() => {
      // Send the email to the user
      sendEmail({
        to: email,
        subject: `Device Confirmation`,
        html: `<div>
                    <p>Dear ${name},</p>
                    <br/>
                    <p>We have noticed that you recently attempted to log in to your account from a new device. 
                    To ensure the security of your account, we require your confirmation before adding this device to your list of trusted devices.</p>
                    <p>Please confirm this device using the OTP below:</p>
                    <h3>${code}</h3>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you are receiving this email and did not try to log in to your account, your account might be compromised. Please reset your password or contact system administrators.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>AccLab Global Team</p>
                </div>`,
      });
    });
};
