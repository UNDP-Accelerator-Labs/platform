const { own_app_url, app_title_short, app_title, translations } = include('config/');
const { email: sendEmail } = include('routes/helpers/')

exports.ssoRedirect = (req, res) => {
const { uri, } = req.query || {}
const { host, referer } = req.headers || {}
console.log(' refe ', referer)
  return res.redirect('/sso-login')
};

