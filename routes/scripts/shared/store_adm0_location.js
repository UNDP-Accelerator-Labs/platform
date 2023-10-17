const { DB } = require('../../../config');

DB.general.tx(async gt => {
	await DB.conn.tx(async t => {
		await t.none(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS iso3 VARCHAR(3);`);
		const batch = []

		batch.push(gt.task(gt => {
			return gt.any(`
				SELECT c.iso3, c.bureau, b.name AS bureau_name
				FROM countries c
				INNER JOIN bureaux b
					ON c.bureau = b.abbv
			;`).then(results => {

				const gbatch = []

				gbatch.push(gt.none(`ALTER TABLE adm0 ADD COLUMN IF NOT EXISTS undp_bureau VARCHAR(9);`))
				gbatch.push(gt.none(`ALTER TABLE adm0 ADD COLUMN IF NOT EXISTS undp_bureau_name VARCHAR(99);`))
				gbatch.push(gt.none(`ALTER TABLE adm0_subunits ADD COLUMN IF NOT EXISTS undp_bureau VARCHAR(9);`))
				gbatch.push(gt.none(`ALTER TABLE adm0_subunits ADD COLUMN IF NOT EXISTS undp_bureau_name VARCHAR(99);`))

				return gt.batch(gbatch)
				.then(_ => {
					const gbatch2 = []

					results.forEach(d => {
						gbatch2.push(gt.none(`UPDATE adm0_subunits SET undp_bureau = $1, undp_bureau_name = $2 WHERE adm0_a3 = $3;`, [ d.bureau, d.bureau_name, d.iso3 ]))
						gbatch2.push(gt.none(`UPDATE adm0 SET undp_bureau = $1, undp_bureau_name = $2 WHERE adm0_a3 = $3;`, [ d.bureau, d.bureau_name, d.iso3 ]))
					})

					return gt.batch(gbatch2)
					.then(_ => {
						const gbatch3 = []
						gbatch3.push(gt.none(`UPDATE users SET iso3 = 'PSX' WHERE iso3 = 'PSE';`))
						gbatch3.push(gt.none(`UPDATE users SET iso3 = 'SDS' WHERE iso3 = 'SSD';`))
						return gt.batch(gbatch3)
						.catch(err => console.log(err))
					})
					.catch(err => console.log(err))
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err)))

		return gt.batch(batch)
		.then(_ => {
			return t.any(`
				SELECT l.id, l.pad, l.lat, l.lng, p.owner FROM locations l
				INNER JOIN pads p
					ON p.id = l.pad
			;`).then(async locations => {
				const iso3 = await gt.task(gt => {
					return gt.batch(locations.map(d => {
						return gt.oneOrNone(`
							SELECT $1 AS id, su_a3 AS iso3
							FROM adm0_subunits
							WHERE ST_CONTAINS(wkb_geometry, ST_SetSRID(ST_Point($2, $3), 4326))
						;`, [ d.id, d.lng, d.lat ])
						.then(result => {
							if (!result) { // DEFAULT TO USER LOCATION
								return gt.one(`
									SELECT $1 AS id, $2 AS pad, 'defaulted to user location'::TEXT AS message, iso3 FROM users
									WHERE uuid = $3
								;`, [ d.id, d.pad, d.owner ])
								.catch(err => console.log(err))
							} else return result
						}).catch(err => console.log(err))
					})).catch(err => console.log(err))
				}).catch(err => console.log(err))

				const update = `${DB.pgp.helpers.update(iso3, [ '?id', 'iso3' ], 'locations')} WHERE v.id = t.id`
				return t.none(update)
				.then(_ => {
					console.log('updated everything')
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}).then(_ => {
	console.log('done')
}).catch(err => console.log(err))
