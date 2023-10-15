const { modules, metafields, DB } = include('config/')
const { datastructures, checklanguage, count, flatObj, join } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.general
	// THIS NEEDS TO BE A TASK
	const { req } = kwargs || {}
	const { space } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	// GET FILTERS
	const [ f_space, page, full_filters ] = await filter(req)

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
				results = await join.locations(results, { connection: t1, language, key: 'id', name_key: 'name' })
				return results.length ? { countries: results.sort((a, b) => a.name?.localeCompare(b.name)) } : null
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
		.then(results => results.filter(d => d.length))
		.catch(err => console.log(err))
	}).then(results => {
		return results.map(d => flatObj.call(d))
	}).catch(err => console.log(err))
}