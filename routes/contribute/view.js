const { modules } = require('../../config.js')
const { language } = require('../header/')
const DB = require('../../db-config.js')

const pad = require('./pad/')
const template = require('./template/')
const mobilization = require('./mobilization/')

exports.main = (req, res) => {
	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = language(lang)

	if (modules.includes(`${object}s`)) {
		if (id) {
			let sql = ''
			if (object !== 'mobilization') {
				sql = DB.pgp.as.format(`
					SELECT uuid FROM contributors
					WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
					AND uuid = $3
				;`, [`${object}s`, +id, uuid])
			} else {
				sql = DB.pgp.as.format(`
					SELECT uuid FROM contributors
					WHERE id = (SELECT host FROM $1:name WHERE id = $2) 
					AND uuid = $3
				;`, [`${object}s`, +id, uuid])
			}

			DB.conn.any(sql)
			.then(results => {
				if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
					res.redirect(`/${lang}/edit/${object}?id=${id}`)
				} else {
					if (object === 'pad') pad.edit(req, res)
					if (object === 'template') template.edit(req, res)
					if (object === 'mobilization') mobilization.edit(req, res)
				}
			})
		} else res.redirect(`/${lang}/contribute/${object}`)
	} else res.redirect('/module-error')
}