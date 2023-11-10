const { modules, metafields, DB } = include('config/')
const { array, datastructures, checklanguage, join, flatObj } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	const { req, res } = kwargs || {}
	
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	const { space } = req.params || {}
	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req, res)

	return conn.task(t => {
		const batch = []
		// GET CONTRBIUTOR BREAKDOWN
		// DEPENDING ON space, GET names OR COUNTRIES
		
		batch.push(t.task(t1 => {
			const batch1 = []
			// GET CONTRIBUTOR BREAKDOWN
			if (['private', 'curated'].includes(space)) {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (id))::INT, owner
					FROM pads p
					WHERE p.id NOT IN (SELECT review FROM reviews)
						$1:raw
					GROUP BY owner
				;`, [ f_space ]) // [ full_filters ])
				.then(async results => {
					let contributors = await join.users(results, [ language, 'owner' ])
					// THIS NEEDS SOME CLEANING FOR THE FRONTEND
					contributors = contributors.map(d => {
						const obj = {}
						obj.id = d.owner
						obj.name = d.ownername
						obj.count = d.count
						return obj
					})
					contributors.sort((a, b) => a.name?.localeCompare(b.name))

					return contributors.length ? { contributors } : null
				}).catch(err => console.log(err)))
			} else if (['pinned', 'shared', 'public', 'all'].includes(space)) {
				if (metafields.some((d) => d.type === 'location')) {
					batch1.push(t1.any(`
						SELECT COUNT(DISTINCT(p.id))::INT, jsonb_agg(DISTINCT(p.id)) AS pads, l.iso3 AS id FROM pads p
						INNER JOIN locations l
							ON l.pad = p.id
						WHERE p.id NOT IN (SELECT review FROM reviews)
							$1:raw
						GROUP BY l.iso3
					;`, [ f_space ])
					.then(async results => {
						// JOIN LOCATION INFO
						let countries = await join.locations(results, { language, key: 'id', name_key: 'name' })
						
						if (countries.length !== array.unique.call(countries, { key: 'name' }).length) {
							console.log('equivalents: need to do something about countries that have equivalents')
							countries = array.nest.call(countries, { key: 'name', keyname: 'name' })
							.map(d => {
								const obj = {}
								obj.name = d.name

								if (d.count > 1) {
									obj.count = array.unique.call(d.values.map(c => c.pads).flat()).length
									obj.id = d.values.splice(0, 1)[0].id
									obj.equivalents = d.values.map(c => c.id)
								} else {
									obj.count = d.values[0].count
									obj.id = d.values[0].id
								}

								return obj
							})
						} else console.log('no equivalents: do nothing')
						countries.sort((a, b) => a.name.localeCompare(b.name))
						return countries.length ? { countries } : null
					}).catch(err => console.log(err)))
				} else {
					batch1.push(t1.any(`
						SELECT p.owner
						FROM pads p
						WHERE p.id NOT IN (SELECT review FROM reviews)
							$1:raw
					;`, [ f_space ]) // [ full_filters ])
					.then(async results => {
						let countries = await join.users(results, [ language, 'owner' ])
						const iso3s = array.unique.call(countries, { key: 'iso3', onkey: true })

						// THIS NEEDS SOME CLEANING FOR THE FRONTEND
						if (iso3s.length !== array.unique.call(countries, { key: 'country' }).length) {
							console.log('equivalents: need to do something about countries that have equivalents')
							countries = array.nest.call(countries, { key: 'country', keyname: 'name' })
							.map(d => {
								const obj = {}
								obj.name = d.name

								if (d.count > 1) {
									obj.count = array.unique.call(d.values.map(c => c.pads).flat()).length
									obj.id = d.values.splice(0, 1)[0].iso3
									obj.equivalents = d.values.map(c => c.iso3)
								} else {
									obj.count = d.values[0].count
									obj.id = d.values[0].iso3
								}

								return obj
							})
						} else {
							console.log('no equivalents: do simple cleanup for frontend')
							countries = array.nest.call(countries, { key: 'country', keyname: 'name', keep: 'iso3' })
							.map(d => {
								const obj = {}
								obj.id = d.iso3
								obj.name = d.name
								obj.count = d.count
								return obj
							})
						}
						countries.sort((a, b) => a.name?.localeCompare(b.name))
						return countries.length ? { countries } : null
					}).catch(err => console.log(err)))
				}
			} else batch1.push(null)
			
			// GET TEMPLATE BREAKDOWN
			if (modules.some(d => d.type === 'templates')) {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (p.id))::INT, t.id, t.title FROM pads p 
					INNER JOIN templates t 
						ON p.template = t.id
					WHERE p.id NOT IN (SELECT review FROM reviews)
						$1:raw
					GROUP BY t.id
				;`, [ f_space ]) // [ full_filters ])
				.then(results => { 
					// THIS NEEDS SOME CLEANING FOR THE FRONTEND
					const templates = results.map(d => {
						const obj = {}
						obj.id = d.id
						obj.name = d.title
						obj.count = d.count
						return obj
					})
					templates.sort((a, b) => a.name?.localeCompare(b.name))

					return templates.length ? { templates } : null
				}))
			} else batch1.push(null)
			
			// GET MOBILIZATIONS BREAKDOWN
			// TO DO: IF USER IS NOT HOST OF THE MBILIZATION, ONLY MAKE THIS AVAILABLE IN PUBLIC VIEW
			// (CONTRIBUTORS CAN ONLY SEE WHAT OTHERS HAVE PUBLISHED)
			// if (modules.some(d => d.type === 'mobilizations') && participations.length) {
			if (modules.some(d => d.type === 'mobilizations')) {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (p.id))::INT, m.id, m.title AS name, start_date FROM pads p 
					INNER JOIN mobilization_contributions mc 
						ON mc.pad = p.id
					INNER JOIN mobilizations m
						ON m.id = mc.mobilization
					WHERE (m.id IN (
						SELECT mobilization
						FROM mobilization_contributors 
							WHERE participant = $1
					) OR m.owner = $1)
						AND p.id NOT IN (SELECT review FROM reviews)
						$2:raw
					GROUP BY m.id
					ORDER BY m.start_date DESC
				;`, [ uuid, f_space ]) // [ uuid, full_filters ])
				.then(results => { 
					return results.length ? { mobilizations: results } : null
				}))
			} else batch1.push(null)
			
			return t1.batch(batch1)
			.then(results => results.filter(d => d))
			.catch(err => console.log(err))
		}).catch(err => console.log(err)))
		
		// GET TAGS, INDEXES, AND OTHER METAFILEDS BREAKDOWN
		batch.push(t.task(t1 => {
			const batch1 = []
			
			metafields.filter(d => ['tag', 'index'].includes(d.type))
			.forEach(d => {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (t.pad))::INT, t.tag_id AS id, t.type FROM tagging t
					INNER JOIN pads p
						ON p.id = t.pad
					WHERE t.type = $1
						AND p.id NOT IN (SELECT review FROM reviews)
						$2:raw
					GROUP BY (tag_id, t.type)
				;`, [ d.label, f_space ]) // [ d.label, full_filters ])
				.then(async results => { 
					const tags = await join.tags(results, [ language, 'id', d.label, d.type ])

					if (d.type === 'index') {
						tags.forEach(d => {
							d.name = `${d.key} – ${d.name}`
							// d.id = d.key
							// delete d.key
						})
						tags.sort((a, b) => a.key - b.key)
					} else tags.sort((a, b) => a.name?.localeCompare(b.name))
					
					let obj = null
					if (tags.length) {
						obj = {}
						obj[d.label.toLowerCase()] = tags
					}
					return obj
				}).catch(err => console.log(err)))
			})

			metafields.filter(d => !['tag', 'index', 'location', 'attachment'].includes(d.type))
			.forEach(d => {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (m.pad))::INT, m.value AS name, m.key AS id FROM metafields m
					INNER JOIN pads p
						ON p.id = m.pad
					WHERE m.name = $1
						AND p.id NOT IN (SELECT review FROM reviews)
						$2:raw
					GROUP BY (m.name, m.value, m.key)
				;`, [ d.label, f_space ]) // [ d.label, full_filters ])
				.then(results => {
					results.sort((a, b) => {
						if (Number.isInteger(a?.id) && Number.isInteger(b?.id)) return a?.id - b?.id
						else return a?.name?.localeCompare(b?.name)
					})
					
					let obj = null
					if (results.length) {
						obj = {}
						obj[d.label.toLowerCase()] = results
					}
					return obj
				}).catch(err => console.log(err)))
			})

			return t1.batch(batch1)
			.then(results => results.filter(d => d))
			.catch(err => console.log(err))
		}).catch(err => console.log(err)))

		return t.batch(batch)
		.then(results => results.filter(d => d.length))
		.catch(err => console.log(err))
	}).then(results => {
		return results.map(d => flatObj.call(d))
	}).catch(err => console.log(err))
}