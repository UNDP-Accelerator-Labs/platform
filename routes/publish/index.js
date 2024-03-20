const { modules } = include('config/')
const { redirectUnauthorized, redirectError } = include('routes/helpers/')

const pads = require('./pads/')
const pinboards = require('./pinboards/')
const templates = require('./templates/')
const files = require('./files/')
const reviews = require('./reviews/')
const mobilizations = require('./mobilizations/')
const { redirectBack } = require('../helpers')

exports.publish = (req, res) => {
	const { referer } = req.headers || {}
	const { rights } = req.session || {}
	const { object } = req.params || {}

	if (modules.some(d => d.type === object)) {
		let { write } = modules.find(d => d.type === object).rights
		// MAKE SURE write IS THE NUMERICAL VALUE
		if (object === 'pads' && typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)

		if (object === 'pads' && rights >= write) pads.publish(req, res)
		else if (object === 'pinboards' && rights >= write) pinboards.publish(req, res)
		else if (object === 'templates' && rights >= write) templates.publish(req, res)
		else if (object === 'files' && rights >= write) files.publish(req, res)
		else if (object === 'reviews' && rights >= write) reviews.publish(req, res)
		else if (object === 'mobilizations' && rights >= write) mobilizations.publish(req, res)

		else {
			redirectUnauthorized(req, res)
		}
	} else redirectError(req, res)
}


exports.unpublish = (req, res) => {
	const { rights } = req.session || {}
	const { object } = req.params || {}

	if (modules.some(d => d.type === object)) {
		const { write } = modules.find(d => d.type === object).rights

		if (object === 'mobilizations' && rights >= write) mobilizations.unpublish(req, res)

		else redirectBack(req, res, true);
	} else redirectError(req, res)
}
