const { modules } = include('config/')

const pads = require('./pads/')
const templates = require('./templates/')
const files = require('./files/')
const reviews = require('./reviews/')
const mobilizations = require('./mobilizations/')
const contributors = require('./contributors/')

module.exports = async (req, res) => {
	const { xhr } = req
	const { object, space, instance } = req.params || {}
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
			let data 
			if (object === 'pads') data = await pads.load({ req })
			else if (object === 'templates') data = await templates.load({ req })
			else if (object === 'files') data = await files.load({ req })
			else if (object === 'reviews') data = await reviews.load({ req })
			else if (object === 'contributors') data = await contributors.load({ req })
			// TO DO: FOR MOBILIZATIONS
			res.status(200).json(data)
		}
	} else if (instance) {
		pads.render(req, res)
	} else res.redirect('/module-error')
}