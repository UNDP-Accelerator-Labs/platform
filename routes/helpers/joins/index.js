const { DB } = include('config/')
const { adm0 } = require('../geo/')

exports.joinObj = function (obj = {}) {
	return {...this, ...obj}
}
exports.multijoin = function (args = []) {
	const [ arr, key ] = args

	return this.map(d => {
		const obj = arr.find(c => c[key] === d[key]) || {}
		return {...d, ...obj}
	})
}
exports.users = (data, args = []) => {
	const [ language, key ] = args
	if (!key) key = 'owner'

	if ((Array.isArray(data) && data.length) || data?.[key]) {
		const uuids = Array.isArray(data) ? [...new Set(data.map(d => d[key]))] : data[key];

		return DB.general.tx(async t => {
			const name_column = await adm0.name_column({ connection: t, language })

			return t.any(`
				SELECT DISTINCT(u.uuid) AS $1:name, u.name AS ownername, u.iso3, u.position, u.rights,
					COALESCE(su.$2:name, adm0.$2:name) AS country
				FROM users u
				LEFT JOIN adm0_subunits su
					ON su.su_a3 = u.iso3
				LEFT JOIN adm0
					ON adm0.adm0_a3 = u.iso3
				WHERE u.uuid IN ($3:csv)
			;`, [ key, name_column, uuids ])
			.then(users => {
				if (Array.isArray(data)) return this.multijoin.call(data, [ users, key ])
				else return this.joinObj.call(data, users[0])
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	} else return async () => data
}
exports.tags = (data, args = []) => {
	const [ lang, key, tagname, tagtype ] = args
	if (!key) return async () => data

	if (data?.length) {
		return DB.general.tx(t => {
			return t.any(`SELECT id AS $1:name, key, language FROM tags WHERE id IN ($2:csv);`, [ key, data.map(d => d[key]) ])
			.then(results => {
				data = this.multijoin.call(data, [ results, key ])

				const batch = []

				const tags_with_equivalences = data.filter(d => ![undefined, null].includes(d.key))
				const tags_without_equivalences = data.filter(d => [undefined, null].includes(d.key))

				if (tags_with_equivalences.length) {
					batch.push(t.any(`
						SELECT t.id AS $1:name, t.key, t.name,

						COALESCE((SELECT jsonb_agg(id) FROM tags WHERE key = t.key GROUP BY key), '[]') AS equivalents

						FROM tags t
						WHERE t.type = $2
							AND key IN ($3:csv)
							AND language = (COALESCE((SELECT language FROM tags WHERE type = $2 AND language = $4 LIMIT 1), 'en'))
					;`, [ key, tagname, tags_with_equivalences.map(d => d.key), lang ])
					.then(tags => {
						// data = this.multijoin.call(data, [ results, key ])
						return this.multijoin.call(tags_with_equivalences, [ tags, 'key' ])
						// return { key: 'key', tags }
					}).catch(err => console.log(err)))
				}
				if (tags_without_equivalences.length) {
					batch.push(t.any(`
						SELECT id AS $1:name, key, name FROM tags
						WHERE type = $2
							AND id IN ($3:csv)
							AND language = (COALESCE((SELECT language FROM tags WHERE type = $2 AND language = $4 LIMIT 1), 'en'))
					;`, [ key, tagname, tags_without_equivalences.map(d => d[key]), lang ])
					.then(tags => {
						return this.multijoin.call(tags_without_equivalences, [ tags, key ])
						// return { key, tags }
					}).catch(err => console.log(err)))
				}

				return t.batch(batch)
				.then(results => {
					return results.flat()
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))

		// FIND LANGUAGE OF TAGS IN DATA
		// IF THERE IS A CORRESPONDANCE THEN FIND IN REQUESTED lang

		// let sql = ''
		// if (tagtype === 'index') {
		// 	sql = DB.pgp.as.format(`
		// 		SELECT id AS $1:name, key, name FROM tags
		// 		WHERE type = $2
		// 			AND id IN ($3:csv)
		// 			AND language = (COALESCE((SELECT language FROM tags WHERE type = $2 AND language = $4 LIMIT 1), 'en'))
		// 	;`, [ key, tagname.slice(0, -1), data.map(d => d[key]), lang ])
		// } else {
		// 	sql = DB.pgp.as.format(`
		// 		SELECT id AS $1:name, name FROM tags
		// 		WHERE type = $2
		// 			AND id IN ($3:csv)
		// 			AND language = (COALESCE((SELECT language FROM tags WHERE type = $2 AND language = $4 LIMIT 1), 'en'))
		// 	;`, [ key, tagname.slice(0, -1), data.map(d => d[key]), lang ])
		// }

		// return DB.general.any(`
		// 	SELECT id AS $1:name, key, name FROM tags
		// 	WHERE type = $2
		// 		AND id IN ($3:csv)
		// 		AND language = (COALESCE((SELECT language FROM tags WHERE type = $2 AND language = $4 LIMIT 1), 'en'))
		// ;`, [ key, tagname, data.map(d => d[key]), lang ])
	} else return async () => (data)
}
exports.concatunique = function (args = []) {
	let [ arr, key, keep ] = args
	const arrcopy = [...arr]
	if (!keep) keep = 'prior'
	const output = []

	this.forEach(d => {
		if (key) {
			if (arrcopy.some(c => c[key] === d[key]) && keep === 'latter') {
				const duplicate = arrcopy.splice(arrcopy.findIndex(c => c[key] === d[key]), 1)[0]
				output.push(duplicate)
			} else output.push(d)
		} else {
			if (arrcopy.some(c => c === d) && keep === 'latter') {
				const duplicate = arrcopy.splice(arrcopy.findIndex(c => c === d))[0]
				output.push(duplicate)
			} else output.push(d)
		}
	})

	return output.concat(arrcopy)
}
exports.locations = (data, kwargs = {}) => {
	const conn = kwargs.connection || DB.general
	let { language, key, name_key, concat_location_key } = kwargs
	if (!key) key = 'iso3'
	if (!name_key) name_key = 'country'

	if ((Array.isArray(data) && data.length) || data?.[key]) {
		const iso3s = Array.isArray(data) ? [...new Set(data.map(d => d[key]))] : data[key];

		return conn.task(async t => {
			const name_column = await adm0.name_column({ connection: t, language })

			let location_structure = DB.pgp.as.format(`
				ST_Y(ST_Centroid(wkb_geometry)) AS lat,
				ST_X(ST_Centroid(wkb_geometry)) AS lng
			`)
			if (concat_location_key) {
				if (concat_location_key === 'geometry') {
					location_structure = DB.pgp.as.format(`
						ST_AsGeoJson(ST_Point(ST_X(ST_Centroid(wkb_geometry)), ST_Y(ST_Centroid(wkb_geometry))))::jsonb AS $1:name
					`, [ concat_location_key ])
				} else {
					location_structure = DB.pgp.as.format(`
						jsonb_build_object('lat', ST_Y(ST_Centroid(wkb_geometry)), 'lng', ST_X(ST_Centroid(wkb_geometry))) AS $1:name
					`, [ concat_location_key ])
				}
			}

			const batch = []
			// GET ONLY THE RELEVANT SUBUNITS
			// THE su_a3 <> adm0_a3 IS IMPORTANT TO AVOID DUPLICATES IN THE END
			batch.push(t.any(`
				SELECT su_a3 AS $1:name, $2:name AS $3:name,
					$4:raw

				FROM adm0_subunits
				WHERE su_a3 IN ($5:csv)
					AND su_a3 <> adm0_a3
			;`, [ key, name_column, name_key, location_structure, iso3s ]).catch(err => console.log(err)))

			batch.push(t.any(`
				SELECT adm0_a3 AS $1:name, $2:name AS $3:name,
					$4:raw

				FROM adm0
				WHERE adm0_a3 IN ($5:csv)
			;`, [ key, name_column, name_key, location_structure, iso3s ]).catch(err => console.log(err)))

			return t.batch(batch)
			.then(results => {
				const [ su_a3, adm_a3 ] = results
				const locations = su_a3.concat(adm_a3)

				if (Array.isArray(data)) return this.multijoin.call(data, [ locations, key ])
				else return this.joinObj.call(data, locations[0])

			}).catch(err => console.log(err))
		}).catch(err => console.log(err))

	} else return async () => (data)

}
