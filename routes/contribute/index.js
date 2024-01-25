const { modules } = include('config/')
const { redirectUnauthorized, redirectError } = include('routes/helpers/')

const pad = require('./pad/')
const xlsx = require('./xlsx/')
const template = require('./template/')
const contributor = require('./contributor/')
const resource = require('./resource/')
const mobilization = require('./mobilization/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights, public } = req.session || {}
	const { object } = req.params || {}

	if (
		modules.some(d => d.type === `${object}s`)
		|| (object === 'xlsx' && (modules.some(d => d.type === 'pads')))
		|| object === 'resource'
	) {
		if (object === 'pad') return pad.render(req, res) // THE || uuid IS FOR PUBLIC ACCESS DURING MOBILIZATIONS
		else if (object === 'xlsx') return xlsx.render(req, res)
		else if (object === 'template') return template.render(req, res)
		else if (object === 'review') return pad.render(req, res)
		else if (object === 'contributor') return contributor(req, res)
		else if (object === 'resource') return resource.render(req, res)
		else if (object === 'mobilization') return mobilization.render(req, res)

		else {
			redirectUnauthorized(req, res)
		}

	} else redirectError(req, res)
}
