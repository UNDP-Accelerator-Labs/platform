const msal = require('@azure/msal-node');
const { msalConfig } = include('config/')
const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = async (req, res, next) => {
    const { sso_redirect_url } = req.query || {}
	const authCodeUrlParameters = {
		scopes: ['user.read', 'User.ReadBasic.All'], // Adjust the scopes based on your requirements
		redirectUri: 'http://localhost:2000/auth/openid/return' //sso_redirect_url,
	};

	const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
	res.redirect(authUrl);
}