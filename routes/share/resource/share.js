const { app_title, DB } = include('config/')
const { checklanguage, email: sendemail, safeArr, DEFAULT_UUID } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

module.exports = (req, res) => {
	// THIS IS TO SEND A RESOURCE
	const req_token = req.body.token || req.query.token || req.headers['x-access-token']
	const { uuid, reqReferer } = req.session || {}
	const { src } = req.query || {}

	if (req_token) { // THE CONSENT IS A pdf COMING FROM THE CONSENT PLATFORM (OTHER APP IN THE SUITE) AND THE REQUEST IS COMMING FROM THAT APP
		try {
			const auth = jwt.verify(req_token, process.env.APP_SUITE_SECRET)
			if (!auth) res.json({ status: 403, message: 'The token is no longer valid.' })
			else {
				const { callback } = auth

				if (src) {
					if (callback?.referer && callback?.endpoint) {
						const { referer, endpoint } = callback
						const res_token = jwt.sign({ uuid, callback, resource_path: src }, process.env.APP_SUITE_SECRET, { expiresIn: 15 * 60 }) // EXPIRES IN 15 MINUTES
						
						const { origin } = new URL(referer)
						const callbackurl = new URL(endpoint, origin)
						const queryparams = new URLSearchParams(callbackurl.search)
						queryparams.set('token', res_token)

						res.redirect(`${callbackurl.href}?${queryparams.toString()}`)
					
					} else res.json({ status: 403, message: 'There is no callback to the request.' })

				} else { // CANCEL THE REQUEST AS NO src IS PASSED: JUST REDIRECT TO THE CALLING PAGE
					res.redirect(callback.referer)
				}
			}
		} catch (err) {
			let message = ''
			if (reqReferer) {
				message = `Sorry it seems this operation has timed out. Please follow this link to go back to your pad: <a href='${reqReferer}'>${reqReferer}</a>`
				req.session.reqReferer = null
			} else {
				message = 'Sorry it seems this operation has timed out. Press the back button in your browser to return to your pads.'
			}
			res.send(message)
		}
	} else res.json({ status: 403, message: 'There has been no request for a resource.' })
}