const { modules, metafields, DB } = include('config/')
const { array, datastructures, checklanguage, count, flatObj, join } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.general
	// THIS NEEDS TO BE A TASK
	let { req, filters } = kwargs || {}
	const { space } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	
	// GET FILTERS
	if (!filters?.length) filters = await filter(req)
	const [ f_space, page, full_filters ] = filters

	return conn.task(t => {
		const batch = []

		batch.push(t.task(t1 => {
			const batch1 = []
			// GET POSITION BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (u.id))::INT, u.position AS id, u.position AS name FROM users u
				WHERE TRUE
					$1:raw
				GROUP BY u.position
			;`, [ f_space ]) // [ full_filters.replace(`AND LEFT(u.name, 1) = '${page}'`, '') ])
			.then(results => {
				return { positions: results }
			}))

			// GET COUNTRY BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (u.id))::INT, u.iso3 AS id
				FROM users u
				WHERE TRUE
					$2:raw
				GROUP BY (u.iso3)
			;`, [ language, f_space ]) // [ language, full_filters.replace(`AND LEFT(u.name, 1) = '${page}'`, '') ])
			.then(async results => {
				// JOIN LOCATION INFO
				let countries = await join.locations(results, { connection: t1, language, key: 'id', name_key: 'name' })
				if (countries.length !== array.unique.call(countries, { key: 'name' }).length) {
					console.log('equivalents: need to do something about countries that have equivalents')
					countries = array.nest.call(countries, { key: 'name', keyname: 'name' })
					.map(d => {
						const obj = {}
						obj.name = d.name

						if (d.count > 1) {
							obj.count = array.unique.call(d.values.map(c => c.contributors).flat()).length
							obj.id = d.values.splice(0, 1)[0].id
							obj.equivalents = d.values.map(c => c.id)
						} else {
							obj.count = d.values[0].count
							obj.id = d.values[0].id
						}

						return obj
					})
				} else console.log('no equivalents: do nothing')
				countries.sort((a, b) => a.name?.localeCompare(b.name))
				return countries.length ? { countries } : null
			}))

			// GET RIGHTS BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (u.id))::INT, u.rights AS id, u.rights AS name FROM users u
				WHERE TRUE
					$1:raw
				GROUP BY u.rights
			;`, [ f_space ]) // [ full_filters.replace(`AND LEFT(u.name, 1) = '${page}'`, '') ])
			.then(results => {
				return results.length ? { rights: results } : null
			}))

			return t1.batch(batch1)
			.then(results => results.filter(d => d))
		}).catch(err => console.log(err)))

		return t.batch(batch)
		.then(results => results.filter(d => d?.length ?? 0))
		.catch(err => console.log(err))
	}).then(results => {
		return results?.map(d => flatObj.call(d)) ?? []
	}).catch(err => console.log(err))
}
