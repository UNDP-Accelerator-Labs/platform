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
exports.name_column = kwargs => {
	const conn = kwargs.connection || DB.general
	const { language } = kwargs || {}
	return conn.many(`
		SELECT DISTINCT column_name FROM information_schema.columns 
		WHERE table_name IN ('adm0', 'adm0_subunits')
			AND column_name LIKE 'name_%'
	;`).then(results => {
		let column = results.find(d => d.column_name.indexOf(language) === 5)?.column_name
		if (column) return column
		else return 'name' // THIS IS THE DEFAULT NAME IN ENGLISH, AS PER NATURAL EARTH DATA
	}).catch(err => console.log(err))
}