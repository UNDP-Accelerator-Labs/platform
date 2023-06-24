const { datastructures } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { originalUrl, path } = req || {}
	const { errormessage } = req.session || {}

	const metadata = await datastructures.pagemetadata({ req, res })
	const data = Object.assign(metadata, { originalUrl, errormessage })

	res.render('login', data)
}