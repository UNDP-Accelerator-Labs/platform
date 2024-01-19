const msal = require('@azure/msal-node');
const { msalConfig, sso_redirect_url } = include('config/')
const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = async (req, res, next) => {
	const authCodeUrlParameters = {
		scopes: ['user.read'], 
		redirectUri: sso_redirect_url,
	};
	
	const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
	res.redirect(authUrl);
}