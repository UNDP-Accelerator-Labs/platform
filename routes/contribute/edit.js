const { modules } = require('../../config.js')
const { language } = require('../header/')
const DB = require('../../db-config.js')

const pad = require('./pad/')
const template = require('./template/')
// const mobilizations = require('./mobilizations/') // TO DO

exports.main = (req, res) => {
	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = language(lang)

	if (modules.includes(`${object}s`)) {
		if (id) {
			DB.conn.any(`
				SELECT uuid FROM contributors
				WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
				AND uuid = $3
			;`, [`${object}s`, +id, uuid])
			.then(results => {
				if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
					if (object === 'pad') pad.edit(req, res)
					if (object === 'template') template.edit(req, res)
					// TO DO : MOBILIZATIONS 
				} else res.redirect(`/${lang}/view/${object}?id=${id}`)
			})
		} else res.redirect(`/${lang}/contribute/${object}`)
	} else res.redirect('/module-error')
}