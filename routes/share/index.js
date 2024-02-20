const { modules } = include('config/')
const { redirectUnauthorized } = include('routes/helpers/')

const pinboards = require('./pinboards/')
const resource = require('./resource/')

exports.share = (req, res) => {
	const { method } = req
	const { referer } = req.headers || {}
	const { rights } = req.session || {}
	const { object } = req.params || {}

	if (['pinboard', 'pinboards'].includes(object)) {
		if (modules.some(d => d.type === 'pinboards' && rights >= d.rights.write)) pinboards.share(req, res)
		else {
			redirectUnauthorized(req, res)
		}
	} else if (['resource', 'resources'].includes(object)) {
		resource.share(req, res)

		// LOGIC IS
		// request/resource
		// AND ON THE OTHER END
		// contribute/resource
		// THEN share/resource

	}
}

exports.unshare = (req, res) => {

}
