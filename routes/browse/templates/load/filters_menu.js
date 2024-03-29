const { modules, DB } = include('config/')
const { array, checklanguage, join, flatObj } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	let { req, filters } = kwargs || {}
	const { uuid, rights, collaborators } = req.session || {}
	const { space } = req.params || {}
	const language = checklanguage(req.params?.language || req.session.language)
	
	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	return conn.task(t => {
		const batch = []
		// GET CONTRBIUTOR BREAKDOWN
		// DEPENDING ON space, GET names OR COUNTRIES

		batch.push(t.task(t1 => {
			const batch1 = []
			if (space === 'private') {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (t.id))::INT, t.owner
					FROM templates t
					WHERE TRUE
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
			} else if (space === 'public') {
				batch1.push(t1.any(`
					SELECT t.owner
					FROM templates t
					WHERE TRUE
						$1:raw
				;`, [ f_space ]) // [ full_filters ])
				.then(async results => {
					let countries = await join.users(results, [ language, 'owner' ])
					countries = array.count.call(countries, { key: 'country', keyname: 'name', keep: 'iso3' })
					// THIS NEEDS SOME CLEANING FOR THE FRONTEND
					countries = countries.map(d => {
						const obj = {}
						obj.id = d.iso3
						obj.name = d.country
						obj.count = d.count
						return obj
					})
					countries.sort((a, b) => a.name?.localeCompare(b.name))
					// TO DO: CHECK WHERE THE undefined COUNTRIES ARE: GUESSING IT IS THE NULL COUNTRY
					// const nest = helpers.array.nest.call(countries, { key: 'country', keyname: 'name', keep: 'iso3' })
					// console.log('here')
					// console.log(nest.find(d => !d.name))
					// THE PB IS THERE ARE PEOPLE MISSING IN THE GLOBAL DB (WITH THEIR ASSOCIATED uuid IN THE PLATFORMS)
					return countries.length ? { countries } : null
				}).catch(err => console.log(err)))

			} else batch1.push(null)

			// GET MOBILIZATIONS BREAKDOWN
			// TO DO: IF USER IS NOT HOST OF THE MBILIZATION, ONLY MAKE THIS AVAILABLE IN PUBLIC VIEW
			// (CONTRIBUTORS CAN ONLY SEE WHAT OTHERS HAVE PUBLISHED)
			// if (modules.some(d => d.type === 'mobilizations') && participations.length) {
			if (modules.some(d => d.type === 'mobilizations')) {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (t.id))::INT, m.id, m.title AS name FROM templates t
					INNER JOIN mobilizations m
						ON m.template = t.id
					WHERE (m.id IN (
						SELECT mobilization
						FROM mobilization_contributors
							WHERE participant = $1
					) OR m.owner = $1)
						$2:raw
					GROUP BY m.id
					ORDER BY m.start_date DESC
				;`, [ uuid, f_space ])
				.then(results => {
				// ;`, [ participations.map(d => d.id), f_space ]).then(results => {
					return results.length ? { mobilizations: results } : null
				}))
			} else batch1.push(null)

			return t1.batch(batch1)
			.then(results => results.filter(d => d))
		}).catch(err => console.log(err)))


		return t.batch(batch)
		.then(results => results.filter(d => d?.length ?? 0))
	}).then(results => {
		return results?.map(d => flatObj.call(d)) ?? []
	})
}
