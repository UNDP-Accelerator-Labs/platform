const { page_content_limit, followup_count, metafields, modules, engagementtypes, map, DB } = include('config/')
const { checklanguage, datastructures, engagementsummary, parsers, array, join } = include('routes/helpers/')

const filter = require('./filter.js')

module.exports = async (req, res) => {	
	// GET FILTERS
	const [ general_filters, platform_filters, f_type ] = await filter(req, res)

	if (platform_filters.length) {
		DB.conn.any(`
			SELECT t.tag_id FROM tagging t
			WHERE TRUE
				$1:raw
				$2:raw
		;`, [ platform_filters, f_type ])
		.then(results => {
			if (results.length) {
				DB.general.any(`
					SELECT t.id, t.name, t.type FROM tags t
					WHERE TRUE
						$1:raw
						AND t.id IN ($2:csv)
						$3:raw
				;`, [ general_filters, results.map(d => d.tag_id), f_type ])
				.then(results => res.json(results))
				.catch(err => console.log(err))
			} else res.status(400).json({ message: 'Sorry it seems there is no content here.' })
		}).catch(err => console.log(err))
	} else {
		DB.general.any(`
			SELECT t.id, t.name, t.type FROM tags t
			WHERE TRUE
				$1:raw
				$2:raw
		;`, [ general_filters, f_type ])
		.then(results => res.json(results))
		.catch(err => console.log(err))
	}
}