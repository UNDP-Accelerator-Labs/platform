const { modules } = include('config/')

const pad = require('./pad.js')
const contributor = require('./contributor.js')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights } = req.session || {}
	const { action, object } = req.body || {}

	if (modules.some(d => d.type === `${object}s`)) {		
		if (object === 'pad') {
			if (modules.some(d => d.type === 'pinboards' && rights >= d.rights.write)) {
				if (action === 'insert') pad.pin(req, res)
				else if (action === 'delete') pad.unpin(req, res)
				else res.redirect('/module-error')
			} else res.redirect('/module-error')
		} else if (object === 'contributor') {
			if (modules.some(d => d.type === 'teams' && rights >= d.rights.write)) {
				if (action === 'insert') contributor.pin(req, res)
				else if (action === 'delete') contributor.unpin(req, res)
				else res.redirect('/module-error')
			} else res.redirect('/module-error')
		} else {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}

	} else res.redirect('/module-error')
}