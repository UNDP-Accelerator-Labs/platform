const DB = require('../../../db-config.js')
const header_data = require('../../header/').data
const load = require('./load').main
const filter = require('./filter').main

exports.main = (req, res) => {
	const { object, space } = req.params || {}

	// GET FILTERS
	const [f_search, f_contributors, f_mobilizations, f_space, order, page] = filter(req)

	DB.conn.tx(async t => {
		const data = await load({ connection: t, req: req })
		const { pagetitle, path, uuid, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })
	
		const batch = []
		
		// SUMMARY STATISTICS
		batch.push(t.task(t1 => {
			const batch1 = []
			// GET TEMPLATES COUNT BY STATUS
			batch1.push(t1.any(`
				SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
				WHERE TRUE
					$1:raw
				GROUP BY t.status
				ORDER BY t.status
			;`, [f_space]).then(d => { return { totalcounts: d } }))
			// GET TEMPLATES COUNT, ACCORDING TO FILTERS
			// TO DO: ADD FILTER FOR MOBILIZATION
			batch1.push(t1.any(`
				SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
				LEFT JOIN mobilizations mob
					ON t.id = mob.template
				WHERE TRUE
					$1:raw $2:raw $3:raw $4:raw
				GROUP BY t.status
				ORDER BY t.status
			;`, [f_search, f_contributors, f_mobilizations, f_space]).then(d => { return { filteredcounts: d } }))
			// GET PRIVATE TEMPLATES COUNT
			batch1.push(t1.one(`
				SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
				WHERE t.contributor IN (SELECT id FROM contributors WHERE country = $1)
				OR $2 > 2
			;`, [country, rights], d => d.count).then(d => { return { privatecount: d } }))
			// GET PUBLIC TEMPLATES COUNT
			batch1.push(t1.one(`
				SELECT COUNT (DISTINCT (t.id))::INT FROM templates t
				WHERE t.status = 2
			;`, [], d => d.count).then(d => { return { publiccount: d } }))
			return t1.batch(batch1)
		}).then(d => d.flatObj()))
		
		// GET CONTRBIUTOR BREAKDOWN
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, c.name, c.id, c.uuid FROM templates t 
			INNER JOIN contributors c 
				ON t.contributor = c.id 
			WHERE TRUE
				$1:raw $2:raw $3:raw 
			GROUP BY c.id
			ORDER BY c.name
		;`, [f_search, f_contributors, f_space]))
		// GET MOBILIZATIONS BREAKDOWN
		if (participations.length) {
			batch.push(t.any(`
				SELECT COUNT(DISTINCT (t.id))::INT, mob.id, mob.title FROM templates t 
				INNER JOIN mobilizations mob
					ON mob.template = t.id
				WHERE mob.id IN ($1:csv)
					$2:raw $3:raw $4:raw
				GROUP BY mob.id
				ORDER BY mob.title
			;`, [participations.map(d => d.id), f_search, f_contributors, f_space]))
		} else batch.push([])

		return t.batch(batch)
		.then(results => {
			let [statistics, contributors, mobilizations] = results

			return {
				metadata : {
					page: {
						title: pagetitle, 
						path: path,
						id: page,
						lang: lang,
						activity: path[1],
						object: object,
						space: space,
						query: query
					},
					user: {
						name: username,
						country: country,
						// centerpoint: JSON.stringify(centerpoint),
						rights: rights,
						participations: participations
					}
				},
				
				stats: { 
					total: statistics.totalcounts.sum('count'), 
					filtered: statistics.filteredcounts.sum('count'),
					
					privatecount: statistics.privatecount,
					publiccount: statistics.publiccount, 
					
					displayed: data.count,
					breakdown: statistics.filteredcounts,
					contributors: contributors.unique('id').length
				},
				// filters: filters

				// templates: data.templates
				sections: data.sections,
				
				// mappers: contributors,
				// mobilizations: mobilizations,
			}
		})
	}).then(data => res.render('browse-templates', data))
	.catch(err => console.log(err))
}