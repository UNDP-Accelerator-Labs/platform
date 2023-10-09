const { DB } = require('../../../config');


DB.conn.tx(t => {
	return t.none(`
		ALTER TABLE locations ADD COLUMN IF NOT EXISTS iso3 VARCHAR(3);
	;`).then(_ => {
		return t.any(`
			SELECT l.id, l.pad, l.lat, l.lng, p.owner FROM locations l
			INNER JOIN pads p
				ON p.id = l.pad
		;`).then(async locations => {
			const iso3 = await DB.general.task(gt => {
				return gt.batch(locations.map(d => {
					return gt.oneOrNone(`
						SELECT $1 AS id, su_a3 AS iso3
						FROM adm0
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
			console.log(iso3)
			const update = `${DB.pgp.helpers.update(iso3, [ '?id', 'iso3' ], 'locations')} WHERE v.id = t.id`
			return t.none(update)
			.then(_ => console.log('updated everything'))
			.catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
})