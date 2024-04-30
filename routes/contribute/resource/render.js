const { modules, DB } = include('config/')
const { checklanguage, flatObj, join, datastructures, safeArr, DEFAULT_UUID } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

module.exports = async (req, res) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']

	let req_resources
	if (token) { // THE CONSENT IS A pdf COMING FROM THE CONSENT PLATFORM (OTHER APP IN THE SUITE) AND THE REQUEST IS COMMING FROM THAT APP
		const auth = jwt.verify(token, process.env.APP_SUITE_SECRET)
		if (!auth) res.json({ status: 403, message: 'You are not allowed to request resources on this platform.' })
		else {
			let { resources } = auth;
			if (resources) {
				if (!Array.isArray(resources)) resources = [resources];
				req_resources = resources.filter(d => modules.some(c => c.type === d));
			}
		}
	}

	const { referer } = req.headers || {}
	req.session.reqReferer = referer // STORE THIS IN CASE THE TOKEN EXPIRES

	const metadata = await datastructures.pagemetadata({ req })
	res.render('contribute/resource', Object.assign(metadata, { req_resources }))
}

// TO DO: IN files TABLE, ALTER COLUMN NAME name TO title FOR CONSISTENCY WITH OTHER MODULES