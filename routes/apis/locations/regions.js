const { DB } = include('config/')
const { checklanguage } = include('routes/helpers/')

module.exports = async (req, res) => {
	let { countries, regions } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	const language = checklanguage(req.params?.language || req.session.language)

	let filters = []
	if (countries) filters.push(DB.pgp.as.format('c.iso3 IN ($1:csv)', [ countries ]))
	if (regions) filters.push(DB.pgp.as.format('c.bureau IN ($1:csv)', [ regions ]))
	
	if (filters.length) filters = filters.join(' AND ')
	else filters = 'TRUE'

	return DB.general.any(`
		SELECT DISTINCT (b.abbv) AS undp_region, b.name AS undp_region_name FROM bureaux b
		LEFT JOIN countries c
			ON c.bureau = b.abbv
		WHERE TRUE
			AND $1:raw
	;`, [ filters ])
	.then(results => {
		if (results.length) res.json(results)
		else res.status(400).json({ message: 'Sorry you do not have the rights to download this content. Please enquire about getting an access token to view download this content.' })
	}).catch(err => console.log(err))
}