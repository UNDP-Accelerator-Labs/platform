const pads = require('./pads/')
const files = require('./files/')
const contributors = require('./contributors/')
const tags = require('./tags/')
const statistics = require('./statistics/')
const locations = require('./locations/')
const jwt = require('jsonwebtoken')

module.exports = (req, res) => {
	const { action, object } = req.params || {}
	const { output, render } = Object.keys(req.body)?.length ? req.body : Object.keys(req.query)?.length ? req.query : {}
	
	// TO DO: ADD Readme.md TO DOWNLOADS
	if (action === 'download') {
		if (render) {
			if (object === 'pads') {
				if (['xlsx', 'csv'].includes(output)) pads.xlsx(req, res)
				else if (['json', 'geojson'].includes(output)) pads.json(req, res)
				else if (output === 'docx') pads.docx(req, res)
				else res.redirect('/module-error')
			} else if (object === 'contributors') {
				if (['xlsx', 'csv'].includes(output)) contributors.xlsx(req, res)
				else if (['json', 'geojson'].includes(output)) contributors.json(req, res)
				else res.redirect('/module-error')
			}
		} else res.redirect('/module-error')
	} else if (action === 'fetch') {
		if (object === 'pads') {
			if (output === 'csv') pads.xlsx(req, res)
			else if (['json', 'geojson'].includes(output)) pads.json(req, res)
			else res.redirect('/module-error')
		} else if (object === 'files') files(req, res)
		else if (object === 'contributors') contributors.json(req, res)
		else if (object === 'tags') tags(req, res)
		else if (object === 'statistics') statistics(req, res)
		else if (object === 'countries') locations.countries(req, res)
		else if (object === 'regions') locations.regions(req, res)
		else res.redirect('/module-error')
	} else res.redirect('/module-error')
}