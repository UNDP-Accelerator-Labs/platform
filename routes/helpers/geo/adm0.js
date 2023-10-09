const { DB } = include('config/')

exports.table = _kwargs => {
	const conn = _kwargs.connection || DB.general
	const { iso3 } = _kwargs
	return conn.task(t => {
		return t.oneOrNone(`
			SELECT TRUE AS bool FROM adm0
			WHERE adm0_a3 = $1
		;`, [ iso3 ], d => d?.bool)
		.then(result => {
			if (result) return 'adm'
			else {
				return t.oneOrNone(`
					SELECT TRUE AS bool FROM adm0_subunits
					WHERE su_a3 = $1
				;`, [ iso3 ], d => d?.bool)
				.then(result => {
					if (result) return 'adm0_subunits'
					else return null
				}).catch(err => console.log(err))
			}
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}