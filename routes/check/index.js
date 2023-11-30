const password = require('./password.js')
const module_rights = require('./module_rights.js')

module.exports = async (req, res) => {
	const { object } = req.params || {}

	if (object === 'password') password(req, res)
	if (object === 'module_rights') await module_rights(req, res)
}