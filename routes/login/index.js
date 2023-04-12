const { app_title, app_title_short, app_languages, modules, DB } = include('config/')
const { checklanguage, datastructures, join } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

exports.check = require('./check.js')
exports.render = require('./render.js')
exports.process = require('./process.js')

exports.redirect = (req, res, next) => {
	const language = checklanguage(req.params?.language ? req.params.language : req.session.language)
	if (req.session.uuid) {
		console.log('should redirect as user is logged in')
		if (req.session.rights >= (modules.find(d => d.type === 'pads')?.rights.write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
		else res.redirect(`/${language}/browse/pads/public`)
	} else next()
}
exports.public = (req, res) => {
	// THIS IS THE MAIN PUBLIC PAGE
	const { path, xhr, query } = req
	const language = checklanguage(req.params?.language ? req.params.language : req.session.language)

	Object.assign(req.session, datastructures.sessiondata({ public: true }))

	if (!req.params.language) res.redirect(`/${req.session.language}/public`)
	else res.redirect(`/${req.params.language}/browse/pads/public`)
}

exports.logout = require('./logout.js')