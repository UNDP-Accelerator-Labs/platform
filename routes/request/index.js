const attachment = require('./attachment')
const review = require('./review')

exports.main = (req, res) => {
	const { object } = req.params || {}
	
	if (['attachment', 'join'].includes(object)) attachment.main(req, res)
	else if (object === 'review') review.main(req, res)
}