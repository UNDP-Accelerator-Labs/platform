const { modules } = include('config/')

const pad = require('./pad/')
const template = require('./template/')
const contributor = require('./contributor/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights } = req.session || {}
	const { object } = req.params || {}

	if (modules.some(d => d.type === object)) {
		const { read, write } = modules.find(d => d.type === object).rights

		if (object === 'pads' && rights >= write) return pad(req, res)
		else if (object === 'templates' && rights >= write) return template(req, res)
		// CANNOT DELETE REVIEWS AT THIS STAGE
		else if (object === 'contributors' && rights >= write) return contributor(req, res)

		else {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}
	} else res.redirect('/module-error')
}