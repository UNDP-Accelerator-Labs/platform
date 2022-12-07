const external_resource = require('./external_resource')
const review = require('./review')

exports.main = (req, res) => {
	const { object } = req.params || {}
	
	if (['external_resource', 'join'].includes(object)) external_resource.main(req, res)
	else if (object === 'review') review.main(req, res)
}