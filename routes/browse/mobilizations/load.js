const DB = require('../../../db-config.js')
const { page_content_limit } = require('../../../config.js')
const filter = require('./filter').main

exports.main = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [f_space, order, page] = filter(kwargs.req)
	
	return conn.any(`
		SELECT mob.id,
			mob.title, 
			mob.status, 
			to_char(mob.start_date, 'DD Mon YYYY') AS start_date, 
			to_char(mob.end_date, 'DD Mon YYYY') AS end_date, 
			c.name AS hostname,
			c.country, 
			cp.id AS country_id,
			t.id AS template_id,
			t.title AS template_title, 
			t.description AS template_description,
			COUNT (DISTINCT(pads.id))::INT AS pads,
			COUNT (DISTINCT(mc.contributor))::INT AS contributors,
			CASE WHEN c.id = (SELECT id FROM contributors WHERE uuid = $1)
				OR $2 > 2
					THEN TRUE
					ELSE FALSE
				END AS editable
		FROM mobilizations mob
		INNER JOIN contributors c
			ON mob.host = c.id
		INNER JOIN centerpoints cp
			ON cp.country = c.country
		INNER JOIN templates t
			ON mob.template = t.id
		LEFT JOIN mobilization_contributions p
			ON mob.id = p.mobilization
		LEFT JOIN pads
			ON p.pad = pads.id AND pads.status = 2
		LEFT JOIN mobilization_contributors mc
			ON mob.id = mc.mobilization
		WHERE c.uuid = $1
			OR $1 IN (SELECT c1.uuid FROM contributors c1 INNER JOIN mobilization_contributors mc1 ON mc1.contributor = c1.id WHERE mc1.mobilization = mob.id)
			$3:raw
			GROUP BY (mob.id, c.id, c.name, c.country, cp.id, t.id)
			ORDER BY pads DESC, start_date DESC
		LIMIT $4 OFFSET $5
	;`, [uuid, rights, f_space, page_content_limit, (page - 1) * page_content_limit])
	.then(results => {
		return { 
			// mobilizations: results,
			count: (page - 1) * page_content_limit, 
			// sections: [
			// 	{ status: 1, label: 'active', mobilizations: results.filter(d => d.status == 1) },
			// 	{ status: 2, label: 'finished', mobilizations: results.filter(d => d.status == 2) }
			// ]
			sections: [{ mobilizations: results }]
		}
	}).catch(err => console.log(err))
}