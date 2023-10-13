const tag = require('./tag/')
const { pinboard, sections } = require('./pinboard/')
const contributor = require('./contributor/')
const pad = require('./pad/')
const template = require('./template/')
const review = require('./review/')
const file = require('./file/')

module.exports = (req, res) => {
	const { object } = req.params || {}

	if (object === 'tag') tag(req, res)
	else if (object === 'pinboard') pinboard(req, res)
	else if (object === 'contributor') contributor(req, res)
	else if (object === 'pad') pad(req, res)
	else if (object === 'template') template(req, res)
	else if (object === 'review') review(req, res)
	else if (object === 'file') file(req, res)
	else res.redirect('/module-error')
}