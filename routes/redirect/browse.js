const { modules } = include('config/')
const { checklanguage } = include('routes/helpers/')

module.exports = (req, res, next) => {
	const { uuid, rights } = req.session || {}
	const language = checklanguage(req.params?.language ? req.params.language : req.session.language)

	if (uuid) {
		if (rights <= modules.find(d => d.type === 'pads')?.rights.write) res.redirect(`/${language}/browse/pads/public`)
		else res.redirect(`/${language}/browse/pads/private`)
	} else next()
}