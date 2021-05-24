const DB = require('../../../db-config.js')
const header_data = require('../../header/').data
const load = require('./load').main
const filter = require('./filter').main

exports.main = (req, res) => { 
	const { object, space } = req.params || {}
	// GET FILTERS
	const [f_space, order, page, full_filters] = filter(req)

	DB.conn.tx(async t => {
		const data = await load({ connection: t, req: req })
		const { pagetitle, path, uuid, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })
		
		const batch = []
		
		
		// SUMMARY STATISTICS
		batch.push(t.task(t1 => {
			const batch1 = []
			// GET PADS COUNT BY STATUS
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
				WHERE TRUE
					$1:raw
				GROUP BY p.status
				ORDER BY p.status
			;`, [f_space]).then(d => { return { totalcounts: d } }))
			// GET PADS COUNT, ACCORDING TO FILTERS
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
				LEFT JOIN mobilization_contributions mob
					ON p.id = mob.pad
				WHERE TRUE 
					$1:raw $2:raw
				GROUP BY p.status
				ORDER BY p.status
			;`, [full_filters, f_space]).then(d => { return { filteredcounts: d } }))
			// GET PRIVATE PADS COUNT
			batch1.push(t1.one(`
				SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
				WHERE p.contributor IN (SELECT id FROM contributors WHERE country = $1)
				OR $2 > 2
			;`, [country, rights], d => d.count).then(d => { return { privatecount: d } }))
			// GET PUBLIC PADS COUNT
			batch1.push(t1.one(`
				SELECT COUNT (DISTINCT (p.id))::INT FROM pads p
				WHERE p.status = 2
			;`, [], d => d.count).then(d => { return { publiccount: d } }))
			return t1.batch(batch1)
		}).then(d => d.flatObj()))

		// GET LOCATIONS, ACCORDING TO FILTERS
		// THIS IS CURRENTLY NOT USED
		batch.push(t.any(`
			SELECT p.location, p.status FROM pads p
			LEFT JOIN mobilization_contributions mob
				ON p.id = mob.pad
			WHERE TRUE
				$1:raw $2:raw
		;`, [full_filters, f_space]))
		// GET THE CENTERPOINT FOR THE MAPPER, IN CASE THERE ARE NO SOLUTIONS (THE MAPS AUTO-CENTERS ON THE LOCATION OF THE CONTRIBUTOR)
		// THIS IS CURRENTLY NOT USED
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [uuid]))
		
		// THE FOLLOWING IS MAINLY FOR THE "NEW" MENU
		// GET TEMPLATE BREAKDOWN
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, t.id, t.title FROM pads p 
			INNER JOIN templates t 
				ON p.template = t.id
			WHERE TRUE 
				$1:raw
			GROUP BY t.id
		;`, [f_space]))
		// GET CONTRBIUTOR BREAKDOWN
		// DEPENDING ON space, GET names OR COUNTRIES
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, c.name, c.id FROM pads p 
			INNER JOIN contributors c 
				ON p.contributor = c.id 
			LEFT JOIN mobilization_contributions mob
				ON p.id = mob.pad
			WHERE TRUE
				$1:raw
			GROUP BY c.id
			ORDER BY c.name
		;`, [full_filters]))
		// GET MOBILIZATIONS BREAKDOWN
		// TO DO: IF USER IS NOT HOST OF THE MBILIZATION, ONLY MAKE THIS AVAILABLE IN PUBLIC VIEW
		// (CONTRIBUTORS CAN ONLY SEE WHAT OTHERS HAVE PUBLISHED)
		if (participations.length) { // TO DO: PB HERE
			// mob SHUOLD BE ON TABLE mobilization_contributions, NOT mobilizations IF FILTERING OR MOBILIZATION
			batch.push(t.any(`
				SELECT COUNT (DISTINCT (p.id))::INT, m.id, m.title FROM pads p 
				INNER JOIN mobilization_contributions mob 
					ON mob.pad = p.id
				INNER JOIN mobilizations m
					ON m.id = mob.mobilization
				WHERE m.id IN ($1:csv)
					$2:raw $3:raw
				GROUP BY m.id
				ORDER BY m.title
			;`, [participations.map(d => d.id), full_filters, f_space]))
		} else batch.push([])

		// GET THE FILTERS
		batch.push(t.task(t1 => {
			const batch1 = []
			// GET CONTRBIUTOR BREAKDOWN
			// DEPENDING ON space, GET names OR COUNTRIES
			if (space === 'private') {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (p.id))::INT, c.name, c.country, c.id FROM pads p 
					INNER JOIN contributors c 
						ON p.contributor = c.id 
					WHERE TRUE
						$1:raw
					GROUP BY c.id
					ORDER BY c.name
				;`, [f_space]).then(d => { return { contributors: d } }))
			} else if (space === 'public') {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (p.id))::INT, c.country AS name, cp.id FROM pads p 
					INNER JOIN contributors c 
						ON p.contributor = c.id 
					INNER JOIN centerpoints cp
						ON c.country = cp.country
					WHERE TRUE
						$1:raw
					GROUP BY (c.country, cp.id)
					ORDER BY c.country
				;`, [f_space]).then(d => { return { countries: d } }))
			} else batch1.push([])
			// GET TEMPLATE BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (p.id))::INT, t.id, t.title FROM pads p 
				INNER JOIN templates t 
					ON p.template = t.id
				WHERE TRUE 
					$1:raw
				GROUP BY t.id
			;`, [f_space]).then(d => { return { templates: d } }))
			// GET MOBILIZATIONS BREAKDOWN
			// TO DO: IF USER IS NOT HOST OF THE MBILIZATION, ONLY MAKE THIS AVAILABLE IN PUBLIC VIEW
			// (CONTRIBUTORS CAN ONLY SEE WHAT OTHERS HAVE PUBLISHED)
			if (participations.length) {
				batch1.push(t1.any(`
					SELECT COUNT (DISTINCT (p.id))::INT, mob.id, mob.title FROM pads p 
					INNER JOIN mobilization_contributions mc 
						ON mc.pad = p.id
					INNER JOIN mobilizations mob
						ON mob.id = mc.mobilization
					WHERE mob.id IN ($1:csv)
						$2:raw
					GROUP BY mob.id
					ORDER BY mob.title
				;`, [participations.map(d => d.id), f_space]).then(d => { return { mobilizations: d } }))
			} else batch1.push({ mobilizations: [] })
			// GET THE THEMATIC AREA BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (pad))::INT, tag_name, tag_id FROM tagging
				WHERE type = 'tags'
				GROUP BY (tag_name, tag_id)
				ORDER BY tag_name
			;`).then(d => { return { thematic_areas: d } }))
			// GET THE SDGs BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (pad))::INT, tag_name, tag_id FROM tagging
				WHERE type = 'sdgs'
				GROUP BY (tag_name, tag_id)
				ORDER BY tag_id
			;`).then(d => { return { sdgs: d } }))
			// GET THE METHODS (SKILLS) BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (pad))::INT, tag_name, tag_id FROM tagging
				WHERE type = 'skills'
				GROUP BY (tag_name, tag_id)
				ORDER BY tag_name
			;`).then(d => { return { methods: d } }))
			// GET THE DATA SOURCES BREAKDOWN
			batch1.push(t1.any(`
				SELECT COUNT (DISTINCT (pad))::INT, tag_name, tag_id FROM tagging
				WHERE type = 'datasources'
				GROUP BY (tag_name, tag_id)
				ORDER BY tag_name
			;`).then(d => { return { datasources: d } }))
			return t1.batch(batch1)
		}).then(d => d.flatObj()))
		// CHECK NUMBER OF PUBLISHED PADS
		// THIS IS TO LIMIT THE NUMBER THAT CAN BE PUBLISHED
		batch.push(t.one(`
			SELECT COUNT (id)::INT FROM pads
			WHERE status = 2
			AND contributor IN 
				(SELECT id FROM contributors WHERE country = (SELECT country FROM contributors WHERE uuid = $1))
		;`, [uuid]))

		return t.batch(batch)
		.then(results => {
			// let [totalcounts, filteredcounts, locations, centerpoint, sdgs, thematic_areas, templates, contributors, mobilizations] = results
			let [ statistics, 
				locations, 
				centerpoint, 
				templates, 
				contributors, 
				mobilizations, 
				filters,
				publications] = results

			console.log(filters.contributors)
			
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
						centerpoint: JSON.stringify(centerpoint),
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
					contributors: contributors.unique('id').length,
					// sdgs: sdgs.unique('key').length,
					// thematic_areas: thematic_areas.unique('name').length
				},
				filters: filters,

				pads: data.pads, // STILL NEED THIS FOR THE MAP AND PIE CHARTS. ULTIMATELY REMOVE WHEN NEW EXPLORE VIEW IS CREATED
				sections: data.sections,
				publications: publications.count
				
				// locations: JSON.stringify(locations), 
				// clusters: JSON.stringify(clusters),
			}
		})
	}).then(data => res.render('browse-pads', data))
	.catch(err => console.log(err))
}

Array.prototype.flatObj = function () {
	// FLATTEN OBJECT: https://stackoverflow.com/questions/31136422/flatten-array-with-objects-into-1-object
	return Object.assign.apply(Object, this)
}