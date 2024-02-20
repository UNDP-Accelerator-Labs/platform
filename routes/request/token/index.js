const { removeSubdomain, redirectError } = require('../../helpers')
const jwt = require('jsonwebtoken')

module.exports = (req, res) => {
	const { uuid, rights } = req.session || {}
	const { host } = req.headers || {}
	const mainHost = removeSubdomain(host);
	if (uuid) {
		const token = jwt.sign({ uuid, rights }, process.env.APP_SECRET, { audience: 'user:known', issuer: mainHost })
		res.status(200).json(token)
	} else redirectError(req, res)
}
