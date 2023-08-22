const { DB } = include('config/')
const load = require('../load/')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}

	return conn.task(t => {
		const batch = []

        batch.push(load.data({ connection: t, req, res, }))

        batch.push(load.filters_menu({ connection: t, req, res, }))
        batch.push(load.statistics({ connection: t, req, res, })) 
        batch.push(load.map_data({ connection: t, req, res, })) 
        batch.push(load.pinboard_list({ connection: t, req, res, })) 
            
        return t.batch(batch)
        .catch(err => console.log(err))
	})
    .then(results => results)
    .catch(err => console.log(err))
}
