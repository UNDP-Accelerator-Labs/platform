const { modules } = include('config/')

const pads = require('./pads/')
const templates = require('./templates/')
const files = require('./files/')
const reviews = require('./reviews/')
const mobilizations = require('./mobilizations/')
const contributors = require('./contributors/')

module.exports = async (req, res) => {
	const { xhr } = req
	let { object, instance } = req.params || {}

	if (modules.some(d => d.type === object)) {
		if (!xhr) {
			if (object === 'pads') pads.render(req, res)
			if (object === 'templates') templates.render(req, res)
			if (object === 'files') files.render(req, res)
			if (object === 'reviews') reviews.render(req, res)
			if (object === 'mobilizations') mobilizations.render(req, res)
			if (object === 'contributors') contributors.render(req, res)
		} else { // AJAX CALL
			let data 
			if (object === 'pads') data = await pads.load({ req: req })
			if (object === 'templates') data = await templates.load({ req: req })
			if (object === 'files') data = await files.load({ req: req })
			if (object === 'reviews') data = await reviews.load({ req: req })
			// TO DO: FOR MOBILIZATIONS
			// TO DO: FOR CONTRIBUTORS
			res.status(200).json(data)
		}
	} else if (instance) {
		pads.render(req, res)
	} else res.redirect('/module-error')
}