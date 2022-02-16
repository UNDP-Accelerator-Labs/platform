const { modules } = require('../../config.js')

const pads = require('./pads/')
const files = require('./files/')
const templates = require('./templates/')
const mobilizations = require('./mobilizations/')

module.exports = async (req, res) => {
	const { xhr } = req
	let { object } = req.params || {}

	if (modules.includes(object)) {
		if (!xhr) {
			if (object === 'pads') pads.render(req, res)
			if (object === 'files') files.render(req, res)
			if (object === 'templates') templates.render(req, res)
			if (object === 'mobilizations') mobilizations.render(req, res)
		} else { // AJAX CALL
			let data 
			if (object === 'pads') data = await pads.load({ req: req })
			if (object === 'files') data = await files.load({ req: req })
			if (object === 'templates') data = await templates.load({ req: req })
			// TO DO: FOR MOBILIZATIONS
			res.status(200).json(data)
		}
	} else res.redirect('/module-error')
}