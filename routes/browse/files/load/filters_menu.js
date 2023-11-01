const { modules, metafields, DB } = include('config/')
const { flatObj } = include('routes/helpers/')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs || {}
	const { uuid, rights, collaborators } = req.session || {}
	const { space } = req.params || {}

	return conn.task(t => {
		const batch = []
		batch.push(t.task(async t1 => {
			const batch1 = []
			if (space === 'private' || space === 'team') {
					contributors = collaborators.map(d => {
						const obj = {}
						obj.id = d.uuid
						obj.name = d.name
						return obj
					})
					contributors.sort((a, b) => a.name?.localeCompare(b.name))

					batch1.push(contributors.length ? { contributors } : null)
			} else if (space === 'all' && rights >= 3) {
				const contributors = await DB.general.any(`
					SELECT u.uuid AS id, u.name, u.iso3, u.position, u.rights
					FROM users u
				;`,)
				.then(async results => results).catch(err => console.log(err))
				batch1.push(contributors.length ? { contributors } : null)
			} else batch1.push(null)
			return t1.batch(batch1)
			.then(results => results.filter(d => d))
		}).catch(err => console.log(err)))


		return t.batch(batch)
		.then(results => results.filter(d => d.length))
	}).then(results => {
		return results.map(d => flatObj.call(d))
	})
	.catch(err=> console.log('err ', err))
}
