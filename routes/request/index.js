const attachment = require('./attachment/')
const review = require('./review/')
const token = require('./token/')

module.exports = (req, res) => {
	const { object } = req.params || {}
	
	if (['attachment', 'join'].includes(object)) attachment(req, res)
	else if (object === 'review') review(req, res)
	else if (object === 'token') token(req, res)
}