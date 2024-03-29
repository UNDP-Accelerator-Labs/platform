const { modules } = include('config/')
const { checklanguage } = include('routes/helpers/')

module.exports = (req, res, next) => {
	const { uuid, rights } = req.session || {}
	const language = checklanguage(req.params?.language ? req.params.language : req.session.language)

	if (uuid && process.env.APP_ID !== 'login') {
		let { read, write } = modules.find(d => d.type === 'pads')?.rights
		if (typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)

		if (rights >= (write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
		else if (rights >= (read ?? Infinity)) res.redirect(`/${language}/browse/pads/published`)
		else res.redirect(`/${language}/browse/pads/published`)
	} else next()
}
