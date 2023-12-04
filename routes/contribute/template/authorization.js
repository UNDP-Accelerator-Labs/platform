const { modules, DB } = include('config/')
const { safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = _kwargs => {
	const conn = _kwargs.connection || DB.conn
	const { uuid, rights, id, collaborators } = _kwargs
	const { read, write } = modules.find(d => d.type === 'templates')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (write ?? Infinity)).map(d => d.uuid)

	if (rights < write) {
		if (id) return conn.one(`SELECT status FROM templates WHERE id = $1::INT;`, [ id ], d => d.status > 2)
			.then(result => {
				if (result === true) return { authorized: rights >= read, redirect: 'view' }
				else return { authorized: false }
			}).catch(err => console.log(err))
		else return new Promise(resolve => resolve({ authorized: false }))
		// return new Promise(resolve => resolve({ authorized: rights >= read, redirect: 'view' }))
	} else {
		if (id) return conn.oneOrNone(`
			SELECT TRUE AS bool FROM templates
			WHERE id = $1::INT
				AND (owner IN ($2:csv) OR $3 > 2)
		;`, [ id, collaborators_ids, rights ])
		.then(result => {
			if (result) return { authorized: true, redirect: 'edit' }
			else return { authorized: rights >= read, redirect: 'view' }
		}).catch(err => console.log(err))
		else return new Promise(resolve => resolve({ authorized: true, redirect: 'contribute' }))
	}
}