const { DB } = include('config/')
const { checklanguage, datastructures, join, parsers } = include('routes/helpers/')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs || {}
    let { pinboard, } = req.query || {}
    const language = checklanguage(req.params?.language || req.session.language)

    if (req.session.uuid) { 
		var { public } = req.session || {}
	} else {
		var { public } = datastructures.sessiondata({ public: true }) || {}
	}

	return conn.task(t => {
		const batch = []

        if (public && !pinboard) {
			batch.push(t.any(`
				SELECT id, title, owner, sections FROM pads
				WHERE status = 3
				ORDER BY random()
				LIMIT 72
			;`).then(async results => {
				const data = await join.users(results, [ language, 'owner' ])
				data.forEach(d => {
					d.img = parsers.getImg(d)
					d.txt = parsers.getTxt(d)
					delete d.sections
					delete d.owner
					delete d.ownername
					delete d.position
				})
				return data
			}))
		} else batch.push(null)

            return t.batch(batch)
            .catch(err => console.log(err))
	}).then(d => d)
	.catch(err => console.log(err))
}
