const tag = require('./tag/')
const { pinboard, section: pinboard_section } = require('./pinboard/')
const contributor = require('./contributor/')
const pad = require('./pad/')
const xlsx = require('./xlsx/')
const template = require('./template/')
const review = require('./review/')
const file = require('./file/')
const resource = require('./resource/')
const mobilization = require('./mobilization/')

module.exports = (req, res) => {
	const { object } = req.params || {}

	if (object === 'tag') tag(req, res)
	else if (object === 'pinboard') pinboard(req, res)
	else if (object === 'pinboard-section') pinboard_section(req, res)
	else if (object === 'contributor') contributor(req, res)
	else if (object === 'pad') pad(req, res)
	else if (object === 'xlsx') xlsx(req, res)
	else if (object === 'template') template(req, res)
	else if (object === 'review') review(req, res)
	else if (object === 'file') file(req, res)
	else if (object === 'resource') resource(req, res)
	else if (object === 'mobilization') mobilization(req, res)
	else res.redirect('/module-error')
}