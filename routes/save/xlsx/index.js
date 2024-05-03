const { modules, metafields, DB } = include('config/')
const { limitLength, array } = include('routes/helpers/')

module.exports = (req, res) => { // TO DO: FIX TAGGING ISSUES AND ADD iso3 LOCATION TO locations TABLE
	// 1 CREATE AND STORE THE TEMPLATE
	// 2 CREATE AND STORE THE PADS
	const { pads, template, tags, mobilization } = req.body || {}
	const { uuid, country } = req.session || {}
	template.owner = uuid

	DB.conn.tx(t => {
		const batch = []

		// INSERT THE TEMPLATE TO GET THE id
		if (template.title) template.title = limitLength(template.title, 99);
		template.sections = JSON.stringify(template.sections)
		const sql = DB.pgp.helpers.insert(template, null, 'templates')
		batch.push(t.one(`
			$1:raw
			RETURNING id AS template_id
		;`, [ sql ], d => d.template_id))

		batch.push(t.any(`
			SELECT DISTINCT type, name, value, key::INT FROM metafields;
		`).then((results) => {
			// CREATE A MAX KEY COUNT FOR EACH
			// type + name + maxkey
			const maxkeys = metafields.filter((c) => !['tag', 'index', 'location'].includes(c.type))
			.map((c) => {
				let identified = results.filter((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && (b.name?.toLowerCase() === c.label?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase()));
				let dbvalue = 0;
				if (identified.length) dbvalue = Math.max(...identified.map((b) => b.key));
				const obj = {}
				obj.type = c.type;
				obj.label = c.label;
				obj.name = c.name;
				obj.max = Math.max((dbvalue + 1) ?? 0, c?.options?.length ?? 0);
				return obj
			});

			return [ results, maxkeys ];
		}).catch(err => console.log(err)))

		return t.batch(batch)
		.then(async (results) => {
			const [ template_id, keys ] = results;
			const [ dbkeys, maxkeys ] = keys;
			// const { template_id } = result
			const tempkeys = [];

			return t.batch(pads.map(d => {
				d.owner = uuid
				d.template = template_id
				d.sections = JSON.stringify(d.sections)
				if (d.title) d.title = limitLength(d.title, 99);

				return t.task(t1 => {
					// STORE PAD INFO
					const sql = DB.pgp.helpers.insert(d, ['title', 'sections', 'full_text', 'status', 'owner', 'template'], 'pads')
					return t1.one(`
						$1:raw
						RETURNING id AS pad_id
					;`, [ sql ])
					.then(result => {
						const { pad_id } = result
						const batch1 = []

						// CHECK WHETHER THE TAGS ARE null AND IF THEY ARE OPEN FOR CODING
						d.tags = d.tags.filter(c => {
							const { opencode, type: metatype } = metafields.find(b => b.label?.toLowerCase() === c.type?.toLowerCase()) || {}
							const isnull = !c.name || (!c.key && metatype === 'index') || false
							return (opencode && !isnull) || false
						})

						if (d.tags?.length) {
							// STORE NEW TAGS
							const tag_types = array.unique.call(d.tags, { key: 'type' })

							d.tags.forEach(c => {
								c.contributor = uuid
								c.name = c.name?.trim()
							})
							
							const sql = DB.pgp.helpers.insert(d.tags, ['name', 'type', 'contributor'], 'tags')
							batch1.push(DB.general.task(gt => {
								return gt.any(`
									$1:raw
									ON CONFLICT ON CONSTRAINT name_type_key
										DO NOTHING
								;`, [ sql ])
								.then(results => {
									return gt.batch(d.tags.map(c => {
										return gt.one(`
											SELECT id AS tag_id, type FROM tags
											WHERE name = $1
												AND type = $2
										;`, [ c.name, c.type ])
									}))
								})
							}).then(results => {
								if (results.length) {
									// SAVE TAGS INFO
									results.forEach(c => c.pad = pad_id)
									const tags_sql = DB.pgp.helpers.insert(results, ['pad', 'tag_id', 'type'], 'tagging')
									return t1.none(`
										$1:raw
										ON CONFLICT ON CONSTRAINT unique_pad_tag_type
											DO NOTHING
									;`, [ tags_sql ])
								} else return null
							}).catch(err => console.log(err)))
						}

						if (d.locations?.filter(d => d).length) {
							// SAVE LOCATIONS INFO
							d.locations.forEach(c => {
								if (c) c.pad = pad_id
							})
							const locations_sql = DB.pgp.helpers.insert(d.locations, ['pad', 'lng', 'lat'], 'locations')
							batch1.push(t1.none(`
								$1:raw
								ON CONFLICT ON CONSTRAINT unique_pad_lnglat
									DO NOTHING
							;`, [ locations_sql ])
							.then(_ => {
								// SAVE THE ISO3 HERE
								return t1.any(`
									SELECT l.id, l.lat, l.lng, p.owner FROM locations l
									INNER JOIN pads p
										ON p.id = l.pad
									WHERE l.pad = $1
								;`, [ pad_id ])
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
									return t1.none(update)
									.catch(err => console.log(err))
								})
							}).catch(err => console.log(err)))
						}

						if (d.metadata?.length) {
							d.metadata.forEach((c) => {
								c.pad = pad_id
								c.value = c.value.replace(/\&amp;/g, '&');

								// SET THE KEYS
								if (!Number.isInteger(c.key)) {
									if (['radiolist', 'checklist'].includes(c.type)) {
										let identified = dbkeys.find((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && b.name?.toLowerCase() === c.name?.toLowerCase() && b.value?.toLowerCase() === c.value?.toLowerCase())
										if (identified) {
											console.log(c.value, 'identified in db results')
											c.key = identified.key;
										} else {
											identified = tempkeys.find((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && b.name?.toLowerCase() === c.name?.toLowerCase() && b.value?.toLowerCase() === c.value?.toLowerCase())
											
											if (identified) {
												console.log(c.value, 'identified in tempkeys')
												c.key = identified.key;
											} else {
												identified = metafields.find((b) => {
													return b.type?.toLowerCase() === c.type?.toLowerCase() 
													&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())
													&& b.options.some((a) => a.name?.toLowerCase() === c.value?.toLowerCase())
												})
												if (identified) {
													console.log(c.value, 'identified in metafields')
													const { options } = identified
													c.key = options.findIndex((b) => b.name?.toLowerCase() === c.value?.toLowerCase())
													// if (idx > -1) c.key = idx;
													// else c.key = null; // TO DO: CHANGE THIS TO MAX AND INCREMENT
												} else {
													console.log(c.value, 'incremented in maxkeys')
													let max = maxkeys.find((b) => {
														return b.type?.toLowerCase() === c.type?.toLowerCase()
														&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())
													})?.max;
													tempkeys.push({ type: c.type, name: c.name, value: c.value, key: max });
													c.key = max;
													// max += 1;
													maxkeys.forEach((b) => {
														if (b.type?.toLowerCase() === c.type?.toLowerCase()
														&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())) {
															b.max += 1
														}
													})
												}
											}
										}
									} else c.key = null
								}
							});

							const metadata_sql = DB.pgp.helpers.insert(d.metadata, ['pad', 'type', 'name', 'key', 'value'], 'metafields')
							return t1.none(`
								$1:raw
								ON CONFLICT ON CONSTRAINT pad_value_type
									DO NOTHING
							;`, [ metadata_sql ])
							.catch((err) => console.log(err))

								// SAVE METAFIELDS
							// GET OR SET THE KEYS
							/*
							batch1.push(t.any(`
								SELECT DISTINCT type, name, value, key::INT FROM metafields;
							`).then((results) => {
								// CREATE A MAX KEY COUNT FOR EACH
								// type + name + maxkey
								const maxkeys = metafields.filter((c) => !['tag', 'index', 'location'].includes(c.type))
								.map((c) => {
									let identified = results.filter((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && (b.name?.toLowerCase() === c.label?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase()));
									let dbvalue = 0;
									if (identified.length) dbvalue = Math.max(...identified.map((b) => b.key));
									const obj = {}
									obj.type = c.type;
									obj.label = c.label;
									obj.name = c.name;
									obj.max = Math.max(dbvalue + 1, c.options.length);
									return obj
								});
								
								const tempkeys = [];

								d.metadata.forEach((c) => {
									c.pad = pad_id
									c.value = c.value.replace(/\&amp;/g, '&'); // THIS IS TO COUNTER THE HTML CHANGE

									if (!Number.isInteger(c.key)) {
										let identified = results.find((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && b.name?.toLowerCase() === c.name?.toLowerCase() && b.value?.toLowerCase() === c.value?.toLowerCase())
										if (identified) {
											console.log(c.value, 'identified in db results')
											c.key = identified.key;
										} else {
											identified = tempkeys.find((b) => b.type?.toLowerCase() === c.type?.toLowerCase() && b.name?.toLowerCase() === c.name?.toLowerCase() && b.value?.toLowerCase() === c.value?.toLowerCase())
											
											if (identified) {
												console.log(c.value, 'identified in tempkeys')
												c.key = identified.key;
											} else {
												identified = metafields.find((b) => {
													return b.type?.toLowerCase() === c.type?.toLowerCase() 
													&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())
													&& b.options.some((a) => a.name?.toLowerCase() === c.value?.toLowerCase())
												})
												if (identified) {
													console.log(c.value, 'identified in metafields')
													const { options } = identified
													c.key = options.findIndex((b) => b.name?.toLowerCase() === c.value?.toLowerCase())
													// if (idx > -1) c.key = idx;
													// else c.key = null; // TO DO: CHANGE THIS TO MAX AND INCREMENT
												} else {
													console.log(c.value, 'incremented in maxkeys')
													let max = maxkeys.find((b) => {
														return b.type?.toLowerCase() === c.type?.toLowerCase()
														&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())
													})?.max;
													tempkeys.push({ type: c.type, name: c.name, value: c.value, key: max });
													c.key = max;
													// max += 1;
													maxkeys.forEach((b) => {
														if (b.type?.toLowerCase() === c.type?.toLowerCase()
														&& (b.label?.toLowerCase() === c.name?.toLowerCase() || b.name?.toLowerCase() === c.name?.toLowerCase())) {
															b.max += 1
														console.log('increment')
														console.log(b.max)
														}
													})
													console.log(maxkeys)
												}
											}
										}
									}
								})

								const metadata_sql = DB.pgp.helpers.insert(d.metadata, ['pad', 'type', 'name', 'key', 'value'], 'metafields')
								return t1.none(`
									$1:raw
									ON CONFLICT ON CONSTRAINT pad_value_type
										DO NOTHING
								;`, [ metadata_sql ])
								.catch((err) => console.log(err))
							}).catch((err) => console.log(err)));
							*/
						}

						if (+mobilization !== -1) {
							// SAVE MOBILIZATION INFO
							// batch1.push(t.none(`
							// 	INSERT INTO mobilization_contributions (pad, mobilization) VALUES ($1, $2)
							// ;`, [ pad_id, mobilization ]))
							batch1.push(t.none(`
								INSERT INTO mobilization_contributions (pad, mobilization)
								SELECT $1::INT, m.id FROM mobilizations m
									WHERE m.id IN ($2::INT, (SELECT source FROM mobilizations WHERE id = $2::INT AND child = TRUE))
							;`, [ pad_id, mobilization ]))
						}

						return t1.batch(batch1)
						.then(_ => pad_id)
						.catch(err => console.log(err))
					}).catch(err => console.log(err))
				}).catch(err => console.log(err))
			})).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).then(results => res.json({ pads: results }))
	.catch(err => console.log(err))
}
