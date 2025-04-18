const { modules, DB } = include('config/')
const { datastructures, checklanguage, flatObj, safeArr, DEFAULT_UUID } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	let { req, res, filters } = kwargs || {}
	const { object } = req.params || {}

	const { uuid, rights, collaborators } = req.session || {}
	// if (req.session.uuid) { // USER IS LOGGED IN
	// 	var { uuid, rights, collaborators } = req.session || {}
	// } else { // PUBLIC/ NO SESSION
	// 	var { uuid, rights, collaborators } = datastructures.sessiondata({ public: true }) || {}
	// }
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters;

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	return conn.task(t => {
		const batch = []
		// GET PADS COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			WHERE p.id NOT IN (SELECT review FROM reviews)
				$1:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [ f_space ]).then(d => { return { total: d } })
		.catch(err => console.log(err)))
		// GET PADS COUNT, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			LEFT JOIN mobilization_contributions mob
				ON p.id = mob.pad
			WHERE p.id NOT IN (SELECT review FROM reviews)
				$1:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [ full_filters ]).then(d => { return { filtered: d } })
		.catch(err => console.log(err)))
		// GET PADS COUNT, ACCORDING TO FILTERS BUT WITHOUT STATUS
		batch.push(t.any(`
			-- LOOKING FOR PERSISTENT BREAKDOWN
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			LEFT JOIN mobilization_contributions mob
				ON p.id = mob.pad
			WHERE p.id NOT IN (SELECT review FROM reviews)
				$1:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [
			full_filters
			.replace(/(AND\s)?p\.status IN \([\'\d\,\s]+\)(\sAND\s)?/g, '$2')
			.replace(/\(\s*AND/g, '(')
		]).then(d => { return { persistent: d } })
		.catch(err => console.log(err)))
		// GET PRIVATE PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
			WHERE p.owner = $1
				AND p.id NOT IN (SELECT review FROM reviews)
		;`, [ uuid, rights ], d => d.count).then(d => { return { private: d } })
		.catch(err => console.log(err)))
		// GET CURATED PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p

			WHERE (
				(
					p.id IN (
						SELECT mc.pad 
						FROM mobilization_contributions mc 
						INNER JOIN mobilizations m 
							ON m.id = mc.mobilization 
						WHERE m.owner = $1
					) 
					OR $2 > 2
				) AND (
					p.owner <> $1 
					OR p.owner IS NULL
				) AND p.status < 2
			) 
			AND p.id NOT IN (SELECT review FROM reviews)

			-- WHERE (p.id IN (
			-- 	SELECT mc.pad FROM mobilization_contributions mc
			-- 	INNER JOIN mobilizations m
			-- 		ON m.id = mc.mobilization
			-- 	WHERE m.owner IN ($1:csv)
			-- ) OR $2 > 2)
			-- 	AND p.id NOT IN (SELECT review FROM reviews)
			-- 	AND (p.owner NOT IN ($1:csv) OR p.owner IS NULL)
			-- 	AND p.status < 2
		;`, [ uuid, rights ], d => d.count).then(d => { return { curated: d } })
		.catch(err => console.log(err)))
		// GET SHARED PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
			-- WHERE p.status = 2
			WHERE (p.owner IN ($1:csv) AND p.owner <> $2)
				AND p.id NOT IN (SELECT review FROM reviews)
		;`, [ collaborators_ids, uuid ], d => d.count).then(d => { return { shared: d } })
		.catch(err => console.log(err)))
		// GET UNDER REVIEW PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
			WHERE (
				(
					p.id IN (
						SELECT mc.pad 
						FROM mobilization_contributions mc
						INNER JOIN mobilizations m
							ON m.id = mc.mobilization
						WHERE m.owner = $1
					) 
					OR $2 > 2
				) OR (
					p.owner = $1
				)
			)
			AND p.id IN (SELECT pad FROM review_requests)
			AND p.id NOT IN (SELECT review FROM reviews)
		;`, [ uuid, rights ], d => d.count).then(d => { return { reviewing: d } }) // TO DO: REMOVE collaborators_ids
		.catch(err => console.log(err)))
		// GET PUBLIC PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
			WHERE p.status = 3
				AND p.id NOT IN (SELECT review FROM reviews)
		;`, [], d => d.count).then(d => { return { public: d } })
		.catch(err => console.log(err)))
		// GET ALL PUBLISHED PADS COUNT
		batch.push(t.one(`
			SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
			WHERE p.status >= 2
				AND p.id NOT IN (SELECT review FROM reviews)
		;`, [], d => d.count).then(d => { return { all: d } })
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