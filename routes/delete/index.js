const { modules } = include('config/')
const { redirectUnauthorized, redirectError } = include('routes/helpers/')

const pad = require('./pad/')
const template = require('./template/')
const contributor = require('./contributor/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights, uuid } = req.session || {}
	const { object } = req.params || {}
	let { id } = req.query || {}

	// CONVERT id TO ARRAY
	if (id && !Array.isArray(id)) id = [id]

	if (modules.some(d => d.type === object)) {
		let { write } = modules.find(d => d.type === object).rights
		// MAKE SURE write IS THE NUMERICAL VALUE
		if (object === 'pads' && typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)
		console.log('check write', write)

		if (object === 'pads' && rights >= write) return pad(req, res)
		else if (object === 'templates' && rights >= write) return template(req, res)
		// CANNOT DELETE REVIEWS AT THIS STAGE
		else if (object === 'contributors' && ((rights >= write) || id.includes(uuid))) return contributor(req, res)

		else {
			redirectUnauthorized(req, res)
		}
	} else redirectError(req, res)
}
