const jwt = require('jsonwebtoken')

exports.generate = async (req, res) => {
	const { uuid, rights } = req.session || {}
	const { host } = req.headers || {}
	if (uuid) {
		const token = jwt.sign({ uuid, rights }, process.env.APP_SECRET, { audience: 'user:known', issuer: host })
		res.status(200).json(token)
	} else res.redirect('/module-error')
}