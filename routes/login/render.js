const { datastructures } = include('routes/helpers/')
const getResetToken = require('./forget-password').getResetToken

module.exports = async (req, res, next) => {
	const { originalUrl, path } = req || {}
	const redirectPath = req?.query?.path;
	const { errormessage, successmessage, page_message, confirm_dev_origins } = req.session || {}
	const origin_url = encodeURIComponent(query.origin) || null

	const { token } = req.params;

	const metadata = await datastructures.pagemetadata({ req, res })
	const data = Object.assign(metadata, {
		originalUrl,
		errormessage,
		successmessage,
		page_message,
		redirectPath: redirectPath ? encodeURIComponent(redirectPath) : undefined,
		origin_url
	})

	if(path === '/forget-password'){
		return res.render('forget-password', data)
	}
	else if(path === '/reset-password'){
		return res.render('reset-password', data)
	}
	else if(path === '/confirm-device'){
		return res.render('confirm-device', data)
	}
	else if(token) getResetToken(req, res, next)

	else res.render('login', data)
}
