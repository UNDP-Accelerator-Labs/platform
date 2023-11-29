const { modules } = include('config/')

const pad = require('./pad/')
const template = require('./template/')
const contributor = require('./contributor/')
const resource = require('./resource/')

// TO DO: CHANGE THE LOGIC OF MOBILIZATIONS
const mobilization = require('../mobilize/cohort/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights, public } = req.session || {}
	const { object } = req.params || {}

	if (modules.some(d => d.type === `${object}s`) || object === 'resource') {
				if (object === 'pad') return pad.render(req, res) // THE || uuid IS FOR PUBLIC ACCESS DURING MOBILIZATIONS
		else if (object === 'template') return template.render(req, res)
		else if (object === 'review') return pad.render(req, res)
		else if (object === 'contributor') return contributor(req, res)
		else if (object === 'resource') return resource.render(req, res)
		else if (object === 'mobilization') return mobilization(req, res)

		else {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}

	} else res.redirect('/module-error')
}
