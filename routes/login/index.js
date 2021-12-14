const config = require('../../config.js')
const DB = require('../../db-config.js')
const jwt = require('jsonwebtoken')
const { language } = require('../header')

exports.render = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { originalUrl } = req

	if (req.session.uuid) next()
	else if (token) this.process(req, res)
	else res.render('login', { title: `${config.title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
}
exports.process = (req, res) => { // REROUTE
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { origin } = req.query

	if (token) {
		if (origin === 'login') {
			const auth = jwt.verify(token, process.env.GLOBAL_LOGIN_KEY)

			if (auth) {
				const { username, iso3, lang, platforms } = auth
				const uuid = platforms.find(d => d.platform === config.title_short)?.uuid

				if (uuid) {
					return DB.conn.oneOrNone(`
						SELECT rights, country FROM contributors
						WHERE uuid = $1
					;`, [uuid])
					.then(result => {
						if (!result) {
							req.session.errormessage = 'You have no account on this platform.'
							res.redirect('/login')
						} else {
							const { rights, country } = result
							req.session.rights = rights
							req.session.country = country

							req.session.uuid = uuid
							req.session.username = username
							req.session.lang = language(lang)

							const query = []
							Object.keys(req.query).forEach(k => {
								if (!['origin', 'token'].includes(k)) query.push(`${k}=${req.query[k]}`)
							})
							req.session.save(_ => res.redirect(`${req.path}${query.length ? `?${query.join('&')}` : ''}`))
						}
					}).catch(err => console.log(err))
				} else {
					req.session.errormessage = 'You are not authorized to log in to this platform.'
					res.redirect('/login')
				}
			} else {
				req.session.errormessage = 'Your access key is not recognized.'
				res.redirect('/login')
			}
		}
	} else {
		const { username, password, originalUrl } = req.body || {}

		if (!username || !password) res.redirect('/login')
		else { 
			DB.conn.oneOrNone(`
				SELECT uuid, name, country, rights, lang FROM contributors
				WHERE (name = $1 OR email = $1)
					AND password = CRYPT($2, password)
			;`, [username, password])
			.then(result => {
				if (result) {
					req.session.uuid = result.uuid
					req.session.username = result.name
					req.session.country = result.country
					req.session.sudo = result.name === 'sudo' // THIS SHOULD BE DEPRECATED
					req.session.rights = result.rights
					if (!result.lang) req.session.lang = 'en'
					else req.session.lang = language(result.lang)

					res.redirect(originalUrl)

				} else res.redirect('/login')
			}).catch(err => console.log(err))
		}
	}
}
exports.redirect = (req, res, next) => {
	const lang = language(req.params && req.params.lang ? req.params.lang : req.session.lang)
	if (req.session.uuid) {
		if (req.session.rights > 0) res.redirect(`/${lang}/browse/pads/private`)
		else res.redirect(`/${lang}/browse/pads/public`)
	} else next()
}
exports.logout = (req, res) => {
	req.session.destroy()
	res.redirect('/')
}