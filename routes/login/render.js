const { datastructures } = include('routes/helpers/')
const getResetToken = require('./forget-password').getResetToken

module.exports = async (req, res, next) => {
	const { originalUrl, path } = req || {}
	const { errormessage, successmessage, page_message, confirm_dev_origins } = req.session || {}
console.log('confirm_dev_origins ', confirm_dev_origins)
	const { token } = req.params;

	const metadata = await datastructures.pagemetadata({ req, res })
	const data = Object.assign(metadata, { originalUrl, errormessage, successmessage, page_message })

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
