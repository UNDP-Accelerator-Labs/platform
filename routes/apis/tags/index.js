const { page_content_limit, followup_count, metafields, modules, engagementtypes, map, DB } = include('config/')
const { checklanguage, datastructures, engagementsummary, parsers, array, join } = include('routes/helpers/')

const filter = require('./filter.js')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}
	const { object } = req.params || {}
	
	// GET FILTERS
	const [ general_filters, platform_filters, type ] = await filter(req, res)

	if (platform_filters.length) {
		DB.conn.any(`
			SELECT t.tag_id FROM tagging t
			WHERE TRUE
				$1:raw
				AND t.type = $2
		;`, [ platform_filters, type ])
		.then(results => {
			DB.general.any(`
				SELECT t.id, t.name, t.type FROM tags t
				WHERE TRUE
					$1:raw
					AND t.id IN ($2:csv)
					AND t.type = $3
			;`, [ general_filters, results.map(d => d.tag_id), type ])
			.then(results => res.json(results))
			.catch(err => console.log(err))
		}).catch(err => console.log(err))
	} else {
		DB.general.any(`
			SELECT t.id, t.name, t.type FROM tags t
			WHERE TRUE
				$1:raw
				AND $2
		;`, [ general_filters, type ])
		.then(results => res.json(results))
		.catch(err => console.log(err))
	}
}