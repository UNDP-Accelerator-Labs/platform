const { welcome_module, DB } = include('config/')
const { checklanguage, parsers, join } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, res, filters } = kwargs || {}

	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	return conn.any(`
		SELECT p.id, p.title, p.owner, p.sections FROM pads p
		WHERE p.id NOT IN (SELECT review FROM reviews)
			$1:raw
		ORDER BY random()
		LIMIT 72
	;`, [ full_filters ]).then(async results => {
		const data = await join.users(results, [ language, 'owner' ])
		data.forEach(d => {
			d.img = parsers.getImg(d)
			d.txt = parsers.getTxt(d)
			delete d.sections
			delete d.owner
			delete d.ownername
			delete d.position
		})
		let max = 10
		if (welcome_module === 'mosaic') max = 46
		return data.filter(d => d.img?.length).slice(0, max)
	}).catch(err => console.log(err))
}