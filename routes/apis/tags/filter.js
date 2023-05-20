const { DB } = include('config/')

module.exports = async (req, res) => {
	let { tags, type, pads, mobilizations, countries } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (!Array.isArray(tags)) tags = [tags]
	if (!Array.isArray(pads)) pads = [pads]
	if (!Array.isArray(mobilizations)) mobilizations = [mobilizations]
	if (!Array.isArray(countries)) countries = [countries]
	if (!type) type = 'thematic_areas'

	return new Promise(async resolve => {

		const general_filters = []
		const platform_filters = []
		

		if (tags.length) general_filters.push(DB.pgp.as.format(`t.id IN ($1:csv)`, [ tags ]))
		if (pads.length) platform_filters.push(DB.pgp.as.format(`t.pad IN ($1:csv)`, [ pads ]))
		if (mobilizations.length) platform_filters.push(DB.pgp.as.format(`t.pad IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($1:csv))`, [ mobilizations ]))
		if (countries.length) {
			platform_filters.push(await DB.general.any(`
				SELECT uuid FROM users
				WHERE iso3 IN ($1:csv)
			;`, [ countries ])
			.then(resutls => DB.pgp.as.format(`t.pad IN (SELECT id FROM pads WHERE owner IN ($1:csv)) AND t.type = $2`, [ results.map(d => d.uuid) ]))
			.catch(err => console.log(err)))
		}

		if (general_filters.length && general_filters.slice(0, 3) !== 'AND') general_filters = `AND ${general_filters}`
		if (platform_filters.length && platform_filters.slice(0, 3) !== 'AND') platform_filters = `AND ${platform_filters}`

		resolve([ general_filters.join(' AND '), platform_filters.join(' AND '), `AND ${type}` ])
	})
}