
const { DB } = include('config/')
const { flatObj, safeArr, DEFAULT_UUID } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, filters } = kwargs || {}

	const { uuid, rights, collaborators } = req.session || {}
	
	// GET FILTERS
	if (!filters?.length) filters = await filter(req)
	const [ f_space, order, page, full_filters ] = filters

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	return conn.task(t => {
		const batch = []
		
		// GET FILES COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (f.id))::INT, f.status FROM files f
			WHERE TRUE
				$1:raw
			GROUP BY f.status
			ORDER BY f.status
		;`, [ f_space ]).then(d => { return { total: d } }))
		// GET PADS COUNT, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (f.id))::INT, f.status FROM files f
			WHERE TRUE
				$1:raw
			GROUP BY f.status
			ORDER BY f.status
		;`, [ full_filters ]).then(d => { return { filtered: d } }))

		// GET PRIVATE FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE f.owner IN ($1:csv)
		;`, [ collaborators_ids ], d => d.count).then(d => { return { private: d } })
		.catch(err => console.log(err)))
		// GET SHARED FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE f.status = 2
		;`, [], d => d.count).then(d => { return { shared: d } })
		.catch(err => console.log(err)))
		// GET PUBLIC FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE f.status = 3
		;`, [], d => d.count).then(d => { return { public: d } })
		.catch(err => console.log(err)))
		// GET ALL FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE  f.status > 0 
		;`, [], d => d.count).then(d => { return { all: d } })
		.catch(err => console.log(err)))

		// GET A COUNT OF CONTRBIUTORS
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.owner))::INT FROM files f
			WHERE TRUE
				$1:raw
		;`, [ full_filters ], d => d.count).then(d => { return { contributors: d } })
		.catch(err => console.log(err)))

		return t.batch(batch)
		.catch(err => console.log(err))
	}).then(d => flatObj.call(d))
	.catch(err => console.log(err))
}
