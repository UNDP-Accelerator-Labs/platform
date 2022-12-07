const password = require('./password')

exports.main = (req, res) => {
	const { object } = req.params || {}

	if (object === 'password') password.main(req, res)
}