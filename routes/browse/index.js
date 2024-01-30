const { modules } = include('config/')
const { redirectError } = include('routes/helpers/')

const pads = require('./pads/')
const templates = require('./templates/')
const files = require('./files/')
const reviews = require('./reviews/')
const mobilizations = require('./mobilizations/')
const contributors = require('./contributors/')

module.exports = async (req, res) => {
	const { xhr } = req
	const { object, instance } = req.params || {}
	const { public } = req.session || {}

	if (modules.some(d => d.type === object)) {
		if (!xhr) {
			if (object === 'pads') pads.render(req, res)
			else if (object === 'templates') templates.render(req, res)
			else if (object === 'files') files.render(req, res)
			else if (object === 'reviews') reviews.render(req, res)
			else if (object === 'mobilizations') mobilizations.render(req, res)
			else if (object === 'contributors') contributors.render(req, res)
		} else { // AJAX CALL
			const { feature } = req.body || {}
			let data
			if (object === 'pads') {
				if (feature === 'locations') { data = await pads.load.locations({ req }) }
				else if (feature === 'samples') { data = await pads.load.samples({ req }) }
				else { data = await pads.load.data({ req }); }
			}
			else if (object === 'templates') data = await templates.load.data({ req })
			else if (object === 'files') data = await files.load.data({ req })
			else if (object === 'reviews') data = await reviews.load.data({ req })
			else if (object === 'mobilizations') data = await mobilizations.load.data({ req })
			else if (object === 'contributors') data = await contributors.load.data({ req })
			res.status(200).json(data)
		}
	} else if (instance) {
		pads.render(req, res)
	} else redirectError(req, res)
}
