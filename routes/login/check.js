const { app_suite, DB } = include('config/')
const { datastructures } = include('routes/helpers/')
const processlogin = require('./process.js')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { sessionID: sid } = req || {}
	const { uuid } = req.session || {}
	req.session.sessions = null
	
	// const cookies = parseCookies(req)
	// let sid = cookies[`${app_suite}-session`]
	// if (sid) sid = sid.split(':')[1].split('.')[0]

	if (uuid) {
		DB.general.tx(t => {
			return t.oneOrNone(`
				SELECT TRUE AS bool FROM session
				WHERE sid = $1
				AND sess ->> 'uuid' = $2
			;`, [ sid, uuid ], d => d.bool)
			.then(result => {
				if (result) {
					return t.one(`SELECT COALESCE(rights, 0)::INT AS rights FROM users WHERE uuid = $1;`, [ uuid ], d => d.rights)
					.then(result => {
						req.session.rights = result
						next()
					}).catch(err => console.log(err))
				} else {
					req.session.destroy()
					res.redirect('/login')
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))

	} else if (token) processlogin(req, res, next) // A LOGIN TOKEN IS RECEIVED
	else { 
		Object.assign(req.session, datastructures.sessiondata({ public: true }))
		next()
	}
}

// CREDIT TO https://stackoverflow.com/questions/3393854/get-and-set-a-single-cookie-with-node-js-http-server
function parseCookies (req) {
	const list = {}
	const cookieHeader = req.headers?.cookie
	if (!cookieHeader) return list

	cookieHeader.split(';')
	.forEach(cookie => {
		let [ name, ...rest] = cookie.split('=')
		name = name?.trim()
		if (!name) return
		const value = rest.join('=').trim()
		if (!value) return
		list[name] = decodeURIComponent(value)
	})

	return list
}