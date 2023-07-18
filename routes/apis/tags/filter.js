const { DB } = include('config/')

module.exports = async (req, res) => {
	let { tags, type, pads, mobilizations, countries, regions, timeseries } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (tags && !Array.isArray(tags)) tags = [tags]
	if (pads && !Array.isArray(pads)) pads = [pads]
	if (mobilizations && !Array.isArray(mobilizations)) mobilizations = [mobilizations]
	if (countries && !Array.isArray(countries)) countries = [countries]
	if (regions && !Array.isArray(regions)) regions = [regions]
	if (!type) type = 'thematic_areas'

	return new Promise(async resolve => {

		let general_filters = []
		let platform_filters = []

		if (tags) {
			general_filters.push(DB.pgp.as.format(`t.id IN ($1:csv)`, [ tags ]))
			if (timeseries) platform_filters.push(DB.pgp.as.format(`t.tag_id IN ($1:csv)`, [ tags ]))
		}
		if (pads) platform_filters.push(DB.pgp.as.format(`t.pad IN ($1:csv)`, [ pads ]))
		if (mobilizations) platform_filters.push(DB.pgp.as.format(`t.pad IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($1:csv))`, [ mobilizations ]))
		if (countries) {
			platform_filters.push(await DB.general.any(`
				SELECT uuid FROM users
				WHERE iso3 IN ($1:csv)
			;`, [ countries ])
			.then(results => DB.pgp.as.format(`t.pad IN (SELECT id FROM pads WHERE owner IN ($1:csv))`, [ results.map(d => d.uuid) ]))
			.catch(err => console.log(err)))
		} else if (regions) {
			platform_filters.push(await DB.general.any(`
				SELECT u.uuid FROM users u
				INNER JOIN countries c
				ON c.iso3 = u.iso3
				WHERE c.bureau IN ($1:csv)
			;`, [ regions ])
			.then(results => DB.pgp.as.format(`t.pad IN (SELECT id FROM pads WHERE owner IN ($1:csv))`, [ results.map(d => d.uuid) ]))
			.catch(err => console.log(err)))
		}
		const f_type = DB.pgp.as.format(`AND t.type = $1`, [ type ])

		general_filters = general_filters.join(' AND ')
		platform_filters = platform_filters.join(' AND ')

		if (general_filters.length && general_filters.slice(0, 3) !== 'AND') general_filters = `AND ${general_filters}`
		if (platform_filters.length && platform_filters.slice(0, 3) !== 'AND') platform_filters = `AND ${platform_filters}`

		resolve([ general_filters, platform_filters, f_type ])
	})
}
