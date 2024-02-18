const { modules } = include('config/')
const { redirectError } = include('routes/helpers/')

const pads = require('./pads/')

module.exports = async (req, res) => {
	let { object } = req.params || {}

	if (modules.some(d => d.type === object)) {
		if (object === 'pads') pads(req, res)
	} else redirectError(req, res)
}
