const { modules } = include('config/')

const pad = require('./pad/')
const template = require('./template/')
const contributor = require('./contributor/')
const resource = require('./resource/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights, public } = req.session || {}
	const { object } = req.params || {}

	if (modules.some(d => d.type === `${object}s`) || object === 'resource') {
		// const { read, write } = modules.find(d => d.type === `${object}s`).rights
		
		if (object === 'pad') return pad(req, res) // THE || uuid IS FOR PUBLIC ACCESS DURING MOBILIZATIONS
		else if (object === 'template') return template(req, res)
		else if (object === 'review') return pad(req, res)
		else if (object === 'contributor') return contributor(req, res)
		else if (object === 'resource') return resource(req, res)

		// if (object === 'pad' && (rights >= write || public)) return pad(req, res) // THE || uuid IS FOR PUBLIC ACCESS DURING MOBILIZATIONS
		// else if (object === 'template' && rights >= write) return template(req, res)
		// else if (object === 'review' && rights >= write) return pad(req, res)
		// else if (object === 'contributor' && rights >= write) return contributor(req, res)

		else {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}

	} else res.redirect('/module-error')
}
