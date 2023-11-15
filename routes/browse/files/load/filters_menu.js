const { DB } = include('config/')
const { flatObj, checklanguage, join } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}

	const { rights} = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	const { space } = req.params || {}
	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req)

	return conn.task(t => {
		const batch = []
		batch.push(t.task(t1 => {
			const batch1 = []
			if (space === 'private') {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (id))::INT, owner
					FROM files f
					WHERE TRUE
						$1:raw
					GROUP BY owner
				;`, [ f_space ])
				.then(async results => {
					let contributors = await join.users(results, [ language, 'owner' ])

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
			} else if (space === 'all') {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (id))::INT, owner
					FROM files f
					WHERE TRUE
						$1:raw
					GROUP BY owner
				;`, [ f_space ])
				.then(async results => {
					let contributors = await join.users(results, [ language, 'owner' ])
					// TO DO: MAYBE SWITCH THIS TO COUNTRIES, LIKE FOR PADS

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
