const resource = require('./resource/')
const review = require('./review/')
const token = require('./token/')

module.exports = (req, res) => {
	const { object } = req.params || {}
	
	if (['resource', 'join'].includes(object)) resource(req, res) // join SHOULD BE DEPRECATED
	else if (object === 'review') review(req, res)
	else if (object === 'token') token(req, res)
}