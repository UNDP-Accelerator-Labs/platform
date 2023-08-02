const { app_title, app_languages, modules, DB } = include('config/')
const { checklanguage, datastructures, join } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

exports.check = require('./check.js')
exports.render = require('./render.js')
exports.process = require('./process.js')
exports.forgetPassword = require('./forget-password.js').forgetPassword
exports.getResetToken = require('./forget-password.js').getResetToken
exports.updatePassword = require('./forget-password.js').updatePassword
exports.isPasswordSecure = require('./password-requirement.js').isPasswordSecure


exports.public = (req, res) => {
	// THIS IS THE MAIN PUBLIC PAGE
	// const language = checklanguage(req.params?.language ? req.params.language : req.session.language)

	// Object.assign(req.session, datastructures.sessiondata({ public: true }))

	// if (!req.params.language) res.redirect(`/${req.session.language}/public`)
	// else res.redirect(`/${req.params.language}/browse/pads/public`)
	// res.redirect(`/${language}/browse/pads/public`)

	// return require('./browse/homepage').render
}

exports.logout = require('./logout.js')