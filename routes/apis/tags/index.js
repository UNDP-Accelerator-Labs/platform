const { DB } = include('config/')
const { join, array } = include('routes/helpers/')

const filter = require('./filter.js')

module.exports = async (req, res) => {	
	let { timeseries, aggregation } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (!aggregation) aggregation = 'day'
	// GET FILTERS
	const [ general_filters, platform_filters, f_type ] = await filter(req, res)

	if (platform_filters.length) {
		if (timeseries) {
			var sql = DB.pgp.as.format(`
				SELECT t.tag_id AS id, 
					array_agg(DATE_TRUNC($1, p.date)) AS dates

				FROM tagging t
				INNER JOIN pads p
					ON t.pad = p.id

				WHERE TRUE
					$2:raw
					$3:raw

				GROUP BY t.tag_id
			;`, [ aggregation, platform_filters, f_type ])
		} else {
			var sql = DB.pgp.as.format(`
				SELECT t.tag_id AS id FROM tagging t
				WHERE TRUE
					$1:raw
					$2:raw
			;`, [ platform_filters, f_type ])
		}

		DB.conn.any(sql)
		.then(results => {
			if (results.length) {
				DB.general.any(`
					SELECT t.id, t.name, t.type FROM tags t
					WHERE TRUE
						$1:raw
						AND t.id IN ($2:csv)
						$3:raw
				;`, [ general_filters, results.map(d => d.id), f_type ])
				.then(tags => {
					let data = join.multijoin.call(results, [ tags, 'id' ])
					
					if (!timeseries) data = array.count.call(data, { key: 'id', keyname: 'id', keep: [ 'name', 'type' ] })
					else {
						data.forEach(d => {
							d.dates.sort((a, b) => +a - +b)
							d.timeseries = array.count.call(d.dates.map(c => c.getTime()), { keyname: 'date' })
							d.timeseries.forEach(c => {
								c.date = new Date(c.date)
							})
							delete d.dates
						})
					}
					res.json(data)
				}).catch(err => console.log(err))
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