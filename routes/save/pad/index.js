const { app_title_short, app_storage, DB } = include('config/')
const { limitLength } = include('routes/helpers/')
const fs = require('fs')
const path = require('path')
const { BlobServiceClient } = require('@azure/storage-blob')

module.exports = (req, res) => {
	const { id, tagging, locations, metadata, deletion, mobilization, source, completion } = req.body || {}
	if (req.body?.sections) req.body.sections = JSON.stringify(req.body.sections)
	if (req.body?.title) req.body.title = limitLength(req.body.title, 99)

	const { uuid } = req.session || {}

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'completion', 'deletion', 'mobilization', 'tagging', 'locations', 'metadata'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})

		var saveSQL = DB.pgp.as.format(`
			INSERT INTO pads ($1:name, owner)
			VALUES ($1:csv, $2)
			RETURNING id
		;`, [ insert, uuid ])
	} else { // UPDATE OBJECT
		const condition = DB.pgp.as.format(` WHERE id = $1::INT;`, [ id ])
		var saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'completion', 'deletion', 'mobilization', 'tagging', 'locations', 'metadata'].includes(d)), 'pads') + condition
	}

	DB.conn.tx(t => {
		const batch = []

		return t.oneOrNone(saveSQL)
		.then(result => {
			const newID = result ? result.id : undefined
			const batch = []

			// SAVE TAGS INFO
			if (tagging?.length) {
				// SAVE TAGS INFO
				tagging.forEach(d => {
					d.tag_id = d.id
					d.pad = newID || id
				})
				// INSERT ALL NEW TAGS
				const sql = DB.pgp.helpers.insert(tagging, ['pad', 'tag_id', 'type'], 'tagging')
				batch.push(t.none(`
					$1:raw
					ON CONFLICT ON CONSTRAINT unique_pad_tag_type
						DO NOTHING
				;`, [ sql ]))
				// REMOVE ALL OLD TAGS
				batch.push(t.none(`
					DELETE FROM tagging
					WHERE pad = $1
						AND tag_id NOT IN ($2:csv)
				;`, [ newID || id, tagging.map(d => d.tag_id) ]))
			} else batch.push(t.none(`
				DELETE FROM tagging
				WHERE pad = $1
			;`, [ newID || id ]))

			// SAVE LOCATIONS INFO
			if (locations?.length) {
				// SAVE THE LOCATION INFO
				locations.forEach(d => d.pad = newID || id)
				const sql = DB.pgp.helpers.insert(locations, ['pad', 'lng', 'lat'], 'locations')
				batch.push(t.none(`
					$1:raw
					ON CONFLICT ON CONSTRAINT unique_pad_lnglat
						DO NOTHING
				;`, [ sql ])
				.then(_ => {
					// SAVE THE ISO3 HERE
					return t.any(`
						SELECT l.id, l.lat, l.lng, p.owner FROM locations l
						INNER JOIN pads p
							ON p.id = l.pad
						WHERE l.pad = $1
					;`, [ newID || id ])
					.then(async locations => {
						const iso3 = await DB.general.task(gt => {
							return gt.batch(locations.map(d => {
								return gt.oneOrNone(`
									SELECT $1 AS id, su_a3 AS iso3
									FROM adm0_subunits
									WHERE ST_CONTAINS(wkb_geometry, ST_SetSRID(ST_Point($2, $3), 4326))
								;`, [ d.id, d.lng, d.lat ])
								.then(result => {
									if (!result) { // DEFAULT TO USER LOCATION
										return gt.one(`
											SELECT $1 AS id, iso3 FROM users
											WHERE uuid = $2
										;`, [ d.id, d.owner ])
										.catch(err => console.log(err))
									} else return result
								}).catch(err => console.log(err))
							})).catch(err => console.log(err))
						}).catch(err => console.log(err))

						const update = `${DB.pgp.helpers.update(iso3, [ '?id', 'iso3' ], 'locations')} WHERE v.id = t.id`
						return t.none(update)
						.catch(err => console.log(err))
					})
				}).catch(err => console.log(err)))
				// REMOVE ALL OLD LOCATIONS
				const values = DB.pgp.helpers.values(locations, ['pad', 'lng', 'lat'])
				batch.push(t.none(`
					DELETE FROM locations
					WHERE pad IN ($1:csv)
						AND (pad, lng, lat) NOT IN ($2:raw)
				;`, [ locations.map(d => d.pad), values ]))
			} else batch.push(t.none(`
				DELETE FROM locations
				WHERE pad = $1
			;`, [ newID || id ]))

			// SAVE EXTRA METADATA INFO
			if (metadata?.length) {
				// SAVE THE METADATA
				metadata.forEach(d => {
					d.pad = newID || id
					if (!Number.isInteger(d.key)) d.key = null
				})
				const sql = DB.pgp.helpers.insert(metadata, ['pad', 'type', 'name', 'key', 'value'], 'metafields')
				batch.push(t.none(`
					$1:raw
					ON CONFLICT ON CONSTRAINT pad_value_type
						DO NOTHING
				;`, [ sql ]))
				// REMOVE ALL OLD METADATA
				const values = DB.pgp.helpers.values(metadata, ['type', 'name', 'key', 'value'])
				batch.push(t.none(`
					DELETE FROM metafields
					WHERE pad = $1
						AND (type, name, key, value) NOT IN ($2:raw)
				;`, [ newID || id, values ]))
			} else batch.push(t.none(`
				DELETE FROM metafields
				WHERE pad = $1
			;`, [ newID || id ]))

			// SAVE MOBILIZATION INFO
			if (mobilization && newID) {
				batch.push(t.none(`
					INSERT INTO mobilization_contributions (pad, mobilization)
					-- VALUES ($1, $2)
					SELECT $1::INT, m.id FROM mobilizations m
						WHERE m.id IN ($2::INT, (SELECT source FROM mobilizations WHERE id = $2::INT AND child = TRUE))
				;`, [ newID, mobilization ]))
			}
			// SAVE VERSION TREE
			if (newID) {
				if (source) {
					batch.push(t.none(`
						UPDATE pads
						SET version = source.version || $1::TEXT
						FROM (SELECT id, version FROM pads) AS source
						WHERE pads.id = $1::INT
							AND source.id = pads.source
					;`, [ newID ]))
				} else {
					batch.push(t.none(`
						UPDATE pads
						SET version = '$1'::ltree
						WHERE id = $1::INT
					;`, [ newID ]))
				}
			}

			// UPDATE THE TIMESTAMP
			batch.push(t.none(`
				UPDATE pads SET update_at = NOW() WHERE id = $1::INT
			;`, [ newID || id]))

			// UPDATE STATUS
			batch.push(t.one(`
				SELECT status FROM pads
				WHERE id = $1::INT
			;`, [ newID || id ], d => d.status)
			.then(status => {
				if (completion) status = Math.max(1, status)
				else status = 0

				return t.none(`
					UPDATE pads SET status = $1::INT
					WHERE id = $2::INT
				;`, [ status, newID || id ])
				.then(_ => status)
				.catch(err => err)
			}).catch(err => console.log(err)))

			return t.batch(batch)
			.then(results => {
				const status = results[results.length - 1]
				return { id: newID, status }
			}).catch(err => console.log(err))
		})
	}).then(data => {
		if (deletion) {
			// TO DO: THIS DOES NOT WORK (GUESSING NO deletion IS BEING SENT)
			const promises = deletion.map(f => {
				if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
					// SEE HERE: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-delete-javascript
					return new Promise(async resolve => {
						const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
						const containerClient = blobServiceClient.getContainerClient(app_title_short)

						const options = { deleteSnapshots: 'include' }
						const blockBlobClient = await containerClient.getBlockBlobClient(f)
						await blockBlobClient.delete(options)
						console.log('file', f, 'deleted')
						resolve()
					})
				} else {
					if (fs.existsSync(path.join(__dirname, `../public/${f}`))) {
						return new Promise(resolve => {
							resolve(fs.unlinkSync(path.join(__dirname, `../public/${f}`)))
						})
					}
				}
			})
			Promise.all(promises).then(_ => res.json({ status: 200, message: 'Successfully saved.', data }))
		} else res.json({ status: 200, message: 'Successfully saved.', data })
	}).catch(err => console.log(err))
}
