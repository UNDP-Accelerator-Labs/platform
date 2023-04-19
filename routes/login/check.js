const { app_suite } = include('config/')
const { datastructures } = include('routes/helpers/')
const processlogin = require('./process.js')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { uuid } = req.session || {}
	
	const cookies = parseCookies(req)
	let sid = cookies[`${app_suite}-session`]
	if (sid) sid = sid.split(':')[1].split('.')[0]
	console.log(cookies)
	console.log(sid)


	if (uuid) next() // A USER IS LOGGED
	else if (token) processlogin(req, res) // A LOGIN TOKEN IS RECEIVED
	else { 
	// if (['browse', 'contribute', 'view'].includes(activity) && ['pad', 'pads'].includes(object)) {
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