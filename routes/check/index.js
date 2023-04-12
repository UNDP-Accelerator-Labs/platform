const password = require('./password.js')

module.exports = (req, res) => {
	const { object } = req.params || {}

	if (object === 'password') password(req, res)
}