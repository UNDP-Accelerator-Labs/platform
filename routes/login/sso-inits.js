const msal = require('@azure/msal-node');
const { msalConfig } = require('../../config')
const { SSO_REDIRECT_URL } = process.env;

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = async (req, res, next) => {
	const authCodeUrlParameters = {
		scopes: ['user.read'], // Adjust the scopes based on your requirements
		redirectUri: SSO_REDIRECT_URL,
	};

	const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
	res.redirect(authUrl);
}