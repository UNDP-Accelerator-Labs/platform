const { modules } = require('../../config.js')
const { language } = require('../header/')
const DB = require('../../db-config.js')

const pad = require('./pad')
const template = require('./template')
const mobilization = require('./mobilization')

exports.main = (req, res) => {
	const { rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = language(lang)

	if (modules.includes(`${object}s`)) {
		if (rights > 0)	{
			if (object === 'pad') pad.create(req, res)
			// if (object === 'import') createImport(req, res)
			if (object === 'template') template.create(req, res)
			if (object === 'mobilization') mobilization.create(req, res)
		} else res.redirect(`/${lang}/browse/${object}s/public`)
	} else res.redirect('/module-error')
}