const { DB } = include('config/')
const { checklanguage } = include('routes/helpers/')

module.exports = async (req, res) => {
	let { countries, regions, has_lab } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (typeof has_lab === 'string') has_lab = JSON.parse(has_lab)
	const language = checklanguage(req.params?.language || req.session.language)

	let filters = []
	if (countries) filters.push(DB.pgp.as.format('c.iso3 IN ($1:csv)', [ countries ]))
	if (regions) filters.push(DB.pgp.as.format('c.bureau IN ($1:csv)', [ regions ]))
	if (has_lab) filters.push(DB.pgp.as.format('c.has_lab = TRUE'))
	
	if (filters.length) filters = filters.join(' AND ')
	else filters = 'TRUE'

	return DB.general.any(`
		SELECT c.iso3, cn.name AS country_name, c.has_lab, b.name AS undp_region_name, b.abbv AS undp_region FROM countries c
		INNER JOIN country_names cn
			ON cn.iso3 = c.iso3
		INNER JOIN bureaux b 
			ON b.abbv = c.bureau
		WHERE cn.language = $1
			AND $2:raw
	;`, [ language, filters ])
	.then(results => {
		if (results.length) res.json(results)
		else res.status(400).json({ message: 'Sorry you do not have the rights to download this content. Please enquire about getting an access token to view download this content.' })
	}).catch(err => console.log(err))
}