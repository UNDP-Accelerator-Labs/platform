const { own_app_url, sso_app_url } = include('config/');

exports.ssoRedirect = (req, res) => {
    console.log(' own_app_url ', own_app_url, sso_app_url)
    // return res.redirect(`${sso_app_url}?originalUrl=${own_app_url}`)
    return res.redirect('/sso-login')
};

