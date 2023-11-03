
const { DB } = include('config/')
const { flatObj, safeArr, DEFAULT_UUID } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}

	const { uuid, rights, collaborators } = req.session || {}
	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req, res)

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

		batch.push(t.any(`
			SELECT COUNT(DISTINCT (f.id))::INT, f.status FROM files f
			WHERE TRUE
				$1:raw
				$2:raw
			GROUP BY f.status
			ORDER BY f.status
		;`, [ full_filters, f_space ]).then(d => { return { filtered: d } }))

		// GET PRIVATE FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE TRUE
			$1:raw
			$2:raw
		;`, [ full_filters, f_space ], d => d.count).then(d => { return { private: d } })
		.catch(err => console.log(err)))
		// GET ALL FILES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.id))::INT FROM files f
			WHERE  f.status > 0 
		;`).then(d => { return { all: d } })
		.catch(err => console.log(err)))

		// GET A COUNT OF CONTRBIUTORS
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (f.owner))::INT FROM files f
			WHERE TRUE
				$1:raw
				$2:raw
		;`, [ full_filters, f_space ], d => d.count).then(d => { return { contributors: d } })
		.catch(err => console.log(err)))

		return t.batch(batch)
		.catch(err => console.log(err))
	}).then(d => flatObj.call(d))
	.catch(err => console.log(err))
}
