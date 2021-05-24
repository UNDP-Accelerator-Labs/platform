const DB = require('../../../db-config.js')
const header_data = require('../../header/').data
const load = require('./load').main
const filter = require('./filter').main

exports.main = (req, res) => {
	const { object, space } = req.params || {}
	// GET FILTERS
	const [f_space, order, page] = filter(req)

	DB.conn.tx(async t => {
		const data = await load({ connection: t, req: req })
		const { pagetitle, path, uuid, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })
	
		const batch = []
		// GET MOBILIZATIONS COUNT
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (mob.id))::INT, mob.status FROM mobilizations mob
			WHERE mob.host IN (SELECT id FROM contributors WHERE uuid = $1)
				OR $1 IN (SELECT c.uuid FROM contributors c INNER JOIN mobilization_contributors mc ON mc.contributor = c.id WHERE mc.mobilization = mob.id)
			GROUP BY mob.status
			ORDER BY mob.status
		;`, [uuid]))
		// GET MOBILIZATIONS COUNT, ACCORDING TO FILTERS
		// TO DO
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (mob.id))::INT, mob.status FROM mobilizations mob
			WHERE mob.host IN (SELECT id FROM contributors WHERE uuid = $1)
				OR $1 IN (SELECT c.uuid FROM contributors c INNER JOIN mobilization_contributors mc ON mc.contributor = c.id WHERE mc.mobilization = mob.id)
			GROUP BY mob.status
			ORDER BY mob.status
		;`, [uuid])) // TO DO: UPDATE FILTER
		// ;`, [f_search, f_contributors, f_space])) // TO DO: UPDATE FILTER
		// GET CONTRBIUTOR BREAKDOWN
		// batch.push(t.any(`
		// 	SELECT COUNT(t.id), c.name, c.id, c.uuid FROM templates t 
		// 	INNER JOIN contributors c 
		// 		ON t.contributor = c.id 
		// 	WHERE TRUE
		// 		$1:raw $2:raw $3:raw 
		// 	GROUP BY c.id
		// 	ORDER BY c.name
		// ;`, [f_search, f_contributors, f_space]))

		return t.batch(batch)
		.then(results => {
			let [totalcounts, filteredcounts] = results

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
					total: totalcounts.sum('count'), 
					filtered: filteredcounts.sum('count'),
					
					ongoing: totalcounts.filter(d => d.status === 1).sum('count'),
					past: totalcounts.filter(d => d.status === 2).sum('count'),
					
					displayed: data.count,
					breakdown: filteredcounts,
					// contributors: contributors.unique('id').length
				},
				// filters: filters,
				
				// mobilizations: data.mobilizations,
				sections: data.sections
			}
		})
	}).then(data => res.render('browse-mobilizations', data))
	.catch(err => console.log(err))
}