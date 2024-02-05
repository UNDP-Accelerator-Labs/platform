const msal = require('@azure/msal-node');
const { msalConfig, sso_redirect_url } = include('config/')
const { extractPathValue } = require('./device-info')

let _msalClient = null;

function getClient() {
	if (!_msalClient) {
		const msalClient = new msal.ConfidentialClientApplication(msalConfig);
		_msalClient = msalClient;
	}
	return _msalClient;
}

module.exports = async (req, res, next) => {
	const { referer } = req.headers || {}
	const { __ucd_app, __puid, __cduid } = req.cookies;

	const extraData = {
        origin_url: extractPathValue(referer),
		app: extractPathValue(referer, true),
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

	const authUrl = await getClient().getAuthCodeUrl(authCodeUrlParameters);
	res.redirect(authUrl);
}
