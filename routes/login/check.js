const { datastructures } = include('routes/helpers/')
const processlogin = require('./process.js')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { uuid } = req.session || {}
	
	if (uuid) next() // A USER IS LOGGED
	else if (token) processlogin(req, res) // A LOGIN TOKEN IS RECEIVED
	else { 
	// if (['browse', 'contribute', 'view'].includes(activity) && ['pad', 'pads'].includes(object)) {
		Object.assign(req.session, datastructures.sessiondata({ public: true }))
		next()
	}
}
