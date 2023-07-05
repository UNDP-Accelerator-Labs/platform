const { modules, DB } = include('config/')
const { datastructures, checklanguage, flatObj } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	const { req, res } = kwargs || {}
	const { object } = req.params || {}

	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ full_filters ] = await filter(req, res)
	
	return conn.task(t => {
		const batch = []
		// GET PADS COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			WHERE p.id NOT IN (SELECT review FROM reviews)
				$1:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [ full_filters ]).then(d => { return { total: d } })
		.catch(err => console.log(err)))
		// GET A COUNT OF CONTRBIUTORS
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.owner))::INT FROM pads p
			WHERE p.id NOT IN (SELECT review FROM reviews)
				$1:raw
		;`, [ full_filters ], d => d.count).then(d => { return { contributors: d } })
		.catch(err => console.log(err)))
		// GET A COUNT OF TAGS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (tag_id))::INT, type FROM tagging
				WHERE pad IN (
					SELECT id FROM pads p 
						WHERE p.id NOT IN (SELECT review FROM reviews)
						$1:raw
				)
			GROUP BY type
		;`, [ full_filters ]).then(d => { return { tags: d } })
		.catch(err => console.log(err)))
		
		return t.batch(batch)
		.catch(err => console.log(err))
	}).then(d => flatObj.call(d))
	.catch(err => console.log(err))
}