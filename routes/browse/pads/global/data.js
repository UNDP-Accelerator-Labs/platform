const { DB } = include('config/')
const load = require('../load/')
const { array } = include('routes/helpers/')
const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}
	const [ f_space, order, page, full_filters ] = await filter(req, res)

	return conn.task(t => {
		const batch = []
        batch.push(t.any(`
            SELECT p.id FROM pads p
            LEFT JOIN mobilization_contributions mob
                ON p.id = mob.pad
            WHERE p.id NOT IN (SELECT review FROM reviews)
                $1:raw
        ;`, [ full_filters ])
        .catch(err => console.log(err)))

        batch.push(load.filters_menu({ connection: t, req, res, }))
        batch.push(load.statistics({ connection: t, req, res, })) 
            
        return t.batch(batch)
        .catch(err => console.log(err))
	})
    .then(results => {
        const [ pads, filters_menu, statistics ] = results
        
        return {
            pads,
            filters_menu,
            stats: {
                filtered: array.sum.call(statistics.filtered, 'count'),
                shared: statistics.shared,
                public: statistics.public
            }
        }
    })
    .catch(err => console.log(err))
}
