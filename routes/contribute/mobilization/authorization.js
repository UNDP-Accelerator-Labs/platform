const { modules, DB } = include('config/')

module.exports = (_kwargs) => {
	const conn = _kwargs.connection || DB.conn
	const { id, rights, uuid } = _kwargs
	let { read, write } = modules.find(d => d.type === 'mobilizations')?.rights || {}

	if (rights < write) {
		if (id) {
			// CHECK IF CONTRIBUTOR IS PART OF THE MOBILIZATION > ONLY CONTRIBUTING USERS CAN SEE THE MOBILIZATION
			return conn.oneOrNone(`
				SELECT TRUE AS bool
				FROM mobilization_contributors mc
				INNER JOIN mobilizations m
					ON m.id = mc.mobilization
				WHERE mc.mobilization = $1::INT
					AND (mc.participant = $2 OR m.owner = $2 OR $3 > 2)
			;`, [ id, uuid, rights ], d => d?.bool)
			.then(result => {
				if (result === true) return { authorized: rights >= read, redirect: 'view' }
				else return { authorized: false }
			}).catch(err => console.log(err))
		} else return async () => ({ authorized: false })
	} else {
		if (id) {
			return conn.oneOrNone(`
				SELECT TRUE AS bool FROM mobilizations
				WHERE id = $1::INT
					AND (owner = $2 OR $3 > 2)
			;`, [ id, uuid, rights ], d => d?.bool)
			.then(result => {
				if (result === true) return { authorized: true, redirect: 'edit' }
				else return { authorized: rights >= read, redirect: 'view' }
			}).catch(err => console.log(err))
		} else return async () => ({ authorized: true, redirect: 'contribute' })
	}
}
