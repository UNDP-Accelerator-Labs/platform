const { modules, DB } = include('config/')
const {flatObj, safeArr, DEFAULT_UUID} = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	let { req, filters } = kwargs || {}
	const { object } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	
	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	return conn.task(t => {
		const batch = []
		// GET TEMPLATES COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
			WHERE TRUE
				$1:raw
			GROUP BY t.status
			ORDER BY t.status
		;`, [ f_space ]).then(d => { return { total: d } }))
		// GET TEMPLATES COUNT, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
			WHERE TRUE
				$1:raw
			GROUP BY t.status
			ORDER BY t.status
		;`, [ full_filters ]).then(d => { return { filtered: d } }))
		// GET TEMPLATES COUNT, ACCORDING TO FILTERS BUT WITHOUT STATUS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
			WHERE TRUE
				$1:raw
			GROUP BY t.status
			ORDER BY t.status
		;`, [ full_filters.replace(/(AND\s)?t.status IN \([\'\d\,\s]+\)(\sAND\s)?/g, '$2') ]).then(d => { return { persistent: d } }))
		// GET PRIVATE TEMPLATES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
			WHERE t.owner IN ($1:csv)
				-- OR $2 > 2
		;`, [ collaborators_ids, rights ], d => d.count).then(d => { return { private: d } }))
		// GET CURATED PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
			WHERE (t.id IN (
					SELECT template FROM mobilizations
					WHERE child = TRUE
						AND source IN (
							SELECT id FROM mobilizations WHERE owner IN ($1:csv)
						)
					)
				OR $2 > 2)
			AND (t.owner NOT IN ($1:csv) OR t.owner IS NULL) AND t.status < 2
		;`, [ collaborators_ids, rights ], d => d.count).then(d => { return { curated: d } }))
		// GET SHARED TEMPLATES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
			WHERE t.status = 2
		;`, [], d => d.count).then(d => { return { shared: d } }))
		// GET PUBLIC TEMPLATES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
			WHERE t.status = 3
		;`, [], d => d.count).then(d => { return { public: d } }))
		// GET ALL PUBLISHED TEMPLATES COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
			WHERE t.status >= 2
		;`, [], d => d.count).then(d => { return { all: d } }))
		// GET A COUNT OF CONTRBIUTORS: NOTE THIS IS NOT USED FOR NOW
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (t.owner))::INT FROM templates t
			WHERE TRUE
				$1:raw
		;`, [ full_filters ]).then(d => { return { contributors: d.count } }))
		// GET MOBILIZATIONS BREAKDOWN
		// if (participations.length) {
		// 	batch.push(t.any(`
		// 		SELECT COUNT(DISTINCT (t.id))::INT, mob.id, mob.title FROM templates t
		// 		INNER JOIN mobilizations mob
		// 			ON mob.template = t.id
		// 		WHERE mob.id IN ($1:csv)
		// 			$2:raw $3:raw $4:raw
		// 		GROUP BY mob.id
		// 		ORDER BY mob.title
		// 	;`, [participations.map(d => d.id), f_search, f_contributors, f_space]))
		// } else batch.push([])

		return t.batch(batch)
	}).then(d => flatObj.call(d))
	.catch(err => console.log(err))
}
