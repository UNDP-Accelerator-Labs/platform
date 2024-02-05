const msal = require('@azure/msal-node');
const { msalConfig, sso_redirect_url, app_title } = include('config/')
const msalClient = new msal.ConfidentialClientApplication(msalConfig);
const { extractPathValue } = require('./device-info')

module.exports = async (req, res, next) => {
	const { referer } = req.headers || {}
	const { __ucd_app, __puid, __cduid } = req.cookies;

	const origin_url = extractPathValue(referer)
	const extraData = {
        origin_url,
		app: req.query.app ?? app_title,
		__ucd_app,
		__puid,
		__cduid
    };
    const encodedState = encodeURIComponent(JSON.stringify(extraData));

	const authCodeUrlParameters = {
		scopes: ['user.read'], 
		redirectUri: sso_redirect_url,
		state: encodedState
	};
	
	const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
	res.redirect(authUrl);
}