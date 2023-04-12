const attachment = require('./attachment.js')
const review = require('./review.js')

module.exports = (req, res) => {
	const { object } = req.params || {}
	
	if (['attachment', 'join'].includes(object)) attachment(req, res)
	else if (object === 'review') review(req, res)
}