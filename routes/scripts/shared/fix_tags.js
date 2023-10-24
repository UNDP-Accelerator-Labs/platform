const { DB } = require('../../../config')
const updatesql = true

DB.conn.tx(t => {
	DB.general.tx(gt => {
		const gbatch = []

		gbatch.push(gt.any(`SELECT id FROM tags WHERE type IS NULL;`))
		gbatch.push(gt.any(`SELECT id, name, type FROM tags WHERE type IS NOT NULL;`))

		return gt.batch(gbatch)
		.then(results => {
			let [ notype_tags, type_tags ] = results
			notype_tags = notype_tags.map(d => d.id)

			return t.any(`
				SELECT id, status, sections FROM pads
			;`).then(results => {
				results = results.filter(d => d.sections)
				// results.forEach(d => {
				// 	d.sections.forEach(c => {
				// 		c.items.forEach(b => {
				// 			if (['tag', 'index'].includes(b.type)) {
				// 				console.log(b.tags)
				// 			}
				// 		})
				// 	})
				// })
				// 1: CHECK THAT ALL tags IN pads > sections ARE REGISTERED IN THE tags TABLE
				const unregistered_tags = results.map(d => d.sections.map(c => c.items.filter(b => ['tag', 'index'].includes(b.type) && b.tags?.length).map(c => c.tags?.filter(b => !b.type)))).flat(3)?.unique('id')
				if (unregistered_tags.filter(d => !(notype_tags.concat(type_tags.map(c => c.id))).includes(d.id)).length > 0) {
					console.log('not all tags are registered in the general dbs tags table') // THIS IS TO CHECK THAT ALL TAGS IN PADS WITH NO TYPES ARE INCLUDED IN THE tags TABLE (length SHOULD BE 0)
					console.log(unregistered_tags.filter(d => !notype_tags.includes(d.id)))
					return []
				} else {
					// CHECK FOR DUPLICATES AND REPLACE THE ids OF DUPLICATES
					let duplicates = results.map(d => d.sections.map(c => c.items.filter(b => ['tag', 'index'].includes(b.type) && b.tags?.length).map(c => c.tags?.filter(b => !b.type)))).flat(3).nest('name')
					duplicates = duplicates.filter(d => d.count > 1)
						.map(d => {
							const obj = { ...d.values.find(c => c.id === Math.min(...d.values.map(b => b.id))) }
							obj.ids = d.values.map(c => c.id)
							return obj
						})

					const batch = []
					const tag_ids = []
					results.forEach(d => {
						const update = d.sections.filter(c => c.items.some(b => ['tag', 'index'].includes(b.type) && b.tags?.some(a => !a.type))).length > 0
						if (update) {
							d.sections.forEach(c => {
								const { items } = c
								items.filter(b => ['tag', 'index'].includes(b.type))
								.forEach(b => {
									const unregistered_tags = b.tags.filter(a => notype_tags.includes(a.id))
									if (unregistered_tags.length > 0) {
										unregistered_tags.forEach(async a => {
											a.type = b.name // SET THE type IN THE pad > sections > tags

											// CHECK IF THE COMPLETE TAG (WITH type) ALREADY EXISTS IN THE DB
											const exists_in_db = type_tags.some(x => x.name === a.name && x.type === a.type)
											console.log(exists_in_db)
											if (exists_in_db) {
												const dup = type_tags.find(x => x.name === a.name && x.type === a.type)
												// a.id = dup.id
												console.log('found complete in database')
												console.log(a)
												console.log(dup)
												console.log('\n')
											} else if (duplicates.some(x => x.ids.includes(a.id))) {
												const dup = duplicates.find(x => x.ids.includes(a.id))
												a.id = dup.id
												console.log('found duplicate')
												console.log(a)
												console.log('\n')
											}

											if (updatesql) {
												batch.push(t.none(`
													INSERT INTO tagging (pad, tag_id, type)
													VALUES ($1, $2, $3)
													ON CONFLICT ON CONSTRAINT unique_pad_tag_type
														DO NOTHING
												;`, [ d.id, a.id, b.name ])
												.catch(err => console.log(err)))
											}
											// IF THE TAG IS NOT ALREADY IN THE DATABASE, STOR IT TO SAVE LATER
											if (!exists_in_db) {
												tag_ids.push({ id: a.id, type: a.type, name: a.name })
											}
										})
									}
								})
							})
							if (updatesql) {
								batch.push(t.none(`
									UPDATE pads
									SET sections = $1::jsonb
									WHERE id = $2
								;`, [ JSON.stringify(d.sections), d.id ]))
							}
						}
					})

					const sections_to_update = results.filter(d => d.sections.some(c => c.items.some(b => ['tag', 'index'].includes(b.type) && b.tags?.some(a => !a.type))))
					console.log(`there are ${sections_to_update.length} sections to update`)

					if (updatesql) {
						return t.batch(batch)
						.then(_ => tag_ids)
						.catch(err => console.log(err))
					} else {
						return tag_ids
					}
				}
			}).catch(err => console.log(err))
		}).then(ids => {
			// UPDATE THE notype_tags IN THE tags TABLE
			if (ids.length) {
				if (updatesql) {
					const sql = `${DB.pgp.helpers.update(ids, ['?id', 'type'], 'tags')} WHERE v.id = t.id`;
					return gt.none(sql)
					.catch(err => console.log(err))
				} else {
					return gt.any(`
						SELECT COUNT(id)::INT, array_agg(id) AS ids, array_agg(DISTINCT(contributor)) AS contributors, name
						FROM tags WHERE name IN ($1:csv)
						GROUP BY name
					;`, [ ids.map(d => d.name) ])
					.then(tags => {
						tags = tags.filter(d => d.count > 1)
						console.log(ids.length)
						console.log(tags.length)
						console.log(tags)
					}).catch(err => console.log(err))
				}
			} else return null
		}).catch(err => console.log(err))
	}).then(_ => console.log('done global'))
	.catch(err => console.log(err))
}).then(_ => console.log('done'))
.catch(err => console.log(err))


Array.prototype.unique = function (key, onkey) {
	const arr = []
	this.forEach(d => {
		if (!key) {
			if (arr.indexOf(d) === -1) arr.push(d)
		}
		else {
			if (onkey) { if (arr.map(c => c).indexOf(d[key]) === -1) arr.push(d[key]) }
			else {
				if (typeof key === 'function') { if (arr.map(c => key(c)).indexOf(key(d)) === -1) arr.push(d) }
				else { if (arr.map(c => c[key]).indexOf(d[key]) === -1) arr.push(d) }
			}
		}
	})
	return arr
}

Array.prototype.nest = function (key, keep) { // THIS IS NOT QUITE THE SAME FUNCTION AS IN distances.js, THIS MORE CLOSELY RESEMBLES d3.nest
	const arr = []
	this.forEach(d => {
		const groupby = typeof key === 'function' ? key(d) : d[key]
		if (!arr.find(c => c.key === groupby)) {
			if (keep) {
				const obj = {}
				obj.key = groupby
				obj.values = [d]
				obj.count = 1
				if (Array.isArray(keep)) keep.forEach(k => obj[k] = d[k])
				else obj[keep] = d[keep]
				arr.push(obj)
			} else arr.push({ key: groupby, values: [d], count: 1 })
		} else {
			arr.find(c => c.key === groupby).values.push(d)
			arr.find(c => c.key === groupby).count ++
		}
	})
	return arr
}
