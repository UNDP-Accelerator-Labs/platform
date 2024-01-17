const { metafields, DB } = include('config/')
const { checklanguage, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = async (req, res) => {
	let { tags, type, pads, language, mobilizations, countries, regions, timeseries } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (tags && !Array.isArray(tags)) tags = [tags]
	if (pads && !Array.isArray(pads)) pads = [pads]
	if (mobilizations && !Array.isArray(mobilizations)) mobilizations = [mobilizations]
	if (countries && !Array.isArray(countries)) countries = [countries]
	if (regions && !Array.isArray(regions)) regions = [regions]
	if (!type) type = 'thematic_areas'

	if (language) language = checklanguage(language)

	return async () => {

		let general_filters = []
		let platform_filters = []

		if (tags) {
			general_filters.push(DB.pgp.as.format(`t.id IN ($1:csv)`, [ tags ]))
			if (timeseries) platform_filters.push(DB.pgp.as.format(`t.tag_id IN ($1:csv)`, [ tags ]))
		}
		if (language) {
			general_filters.push(DB.pgp.as.format(`t.language = $1`, [ language ]))
		}
		if (pads) platform_filters.push(DB.pgp.as.format(`t.pad IN ($1:csv)`, [ pads ]))
		if (mobilizations) platform_filters.push(DB.pgp.as.format(`t.pad IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($1:csv))`, [ mobilizations ]))
		if (countries) {
			if (metafields.some((d) => d.type === 'location')) {
				platform_filters.push(DB.pgp.as.format(`t.pad IN (SELECT pad FROM locations WHERE iso3 IN ($1:csv))`, [ countries ]))
			} else {
				platform_filters.push(await DB.general.any(`
					SELECT uuid FROM users WHERE iso3 IN ($1:csv)
				;`, [ countries ])
				.then(results => DB.pgp.as.format(`t.pad IN (SELECT id FROM pads WHERE owner IN ($1:csv))`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
				.catch(err => console.log(err)))
			}
		} else if (regions) {
			if (metafields.some((d) => d.type === 'location')) {
				platform_filters.push(await DB.general.task(t => {
					const batch = []

					batch.push(t.any(`
						SELECT DISTINCT (su_a3) AS iso3 FROM adm0_subunits
						WHERE undp_bureau IN ($1:csv)
					;`, [ regions ]))
					batch.push(t.any(`
						SELECT DISTINCT (adm0_a3) AS iso3 FROM adm0_subunits
						WHERE undp_bureau IN ($1:csv)
					;`, [ regions ]))
					return t.batch(batch)
					.then(results => {
						const [ su_a3, adm_a3 ] = results
						let locations = su_a3.concat(adm_a3)
						return locations
					}).catch(err => console.log(err))
				}).then(results => DB.pgp.as.format(`t.pad IN (SELECT pad FROM locations WHERE iso3 IN ($1:csv))`, [ safeArr(results.map(d => d.iso3), DEFAULT_UUID) ]))
				.catch(err => console.log(err)))
			} else {
				platform_filters.push(await DB.general.any(`
					SELECT DISTINCT (u.uuid) FROM users u
					INNER JOIN adm0_subunits c
						ON c.su_a3 = u.iso3
						OR c.adm0_a3 = u.iso3
					WHERE c.undp_bureau IN ($1:csv)
				;`, [ regions ])
				.then(results => DB.pgp.as.format(`t.pad IN (SELECT id FROM pads WHERE owner IN ($1:csv))`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
				.catch(err => console.log(err)))
			}
		}
		const f_type = DB.pgp.as.format(`AND t.type = $1`, [ type ])

		general_filters = general_filters.join(' AND ')
		platform_filters = platform_filters.join(' AND ')

		if (general_filters.length && general_filters.slice(0, 3) !== 'AND') general_filters = `AND ${general_filters}`
		if (platform_filters.length && platform_filters.slice(0, 3) !== 'AND') platform_filters = `AND ${platform_filters}`

		return [ general_filters, platform_filters, f_type ]
	}
}
