const msal = require('@azure/msal-node');
const { msalConfig, sso_redirect_url } = include('config/')
const { extractPathValue } = require('./device-info');
const { is } = require('useragent');

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
	let { is_api_call, host_redirect_url, host_redirect_failed_auth_url } = req.query || {};

	is_api_call = is_api_call === 'true' || is_api_call === true;

	const extraData = {
        origin_url: extractPathValue(referer),
		app: extractPathValue(referer, true),
		host_redirect_url: host_redirect_url || null,
		host_redirect_failed_auth_url: host_redirect_failed_auth_url || null,
		is_api_call: is_api_call || false,
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
	if (is_api_call) {
		return res.status(200).json({ status: 200, authUrl });
	}
	res.redirect(authUrl);
}
