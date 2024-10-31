const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
// const rootpath = path.resolve(__dirname, '../..')
// global.include = path => require(`${rootpath}/${path}`)

const turf = require('@turf/turf')
const { BlobServiceClient } = require('@azure/storage-blob')

const { app_title_short, app_storage, page_content_limit, metafields, ownDB, DB } = include('config/')
const { checklanguage, array, join, parsers, safeArr } = include('routes/helpers/')

const filter = include('routes/browse/pads/filter');

module.exports = async (req, res) => {
	const { host } = req.headers || {}
	const token = req.body.token || req.query.token || req.headers['x-access-token']
 	let { output, render, use_templates, include_data, include_imgs, include_tags, include_locations, include_metafields, include_source, include_engagement, include_comments, page, limit } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (typeof use_templates === 'string') use_templates = JSON.parse(use_templates)
	if (typeof include_imgs === 'string') include_imgs = JSON.parse(include_imgs)
	if (typeof include_locations === 'string') include_locations = JSON.parse(include_locations)

	const pw = req.session.email || null
	const language = checklanguage(req.params?.language || req.session.language)

	const [ f_space, order, default_page, full_filters ] = await filter(req, res)
	let cors_filter = ''
	if (!pw) cors_filter = DB.pgp.as.format(`AND p.status > 2`)

	let page_filter = ''
	if (!isNaN(+page)) page_filter = DB.pgp.as.format(`LIMIT $1 OFFSET $2;`, [ limit ? +limit : page_content_limit, limit ? (+page - 1) * +limit : (+page - 1) * page_content_limit ])

	if (output === 'geojson') {
		include_locations = true
	}

	// CREATE A tmp FOLDER TO STORE EVERYTHING
	if (render) {
		// const basedir = path.join(__dirname, `../public/uploads/`)
		var basedir = path.join(rootpath, '/tmp')
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		const now = new Date()
		var dir = path.join(basedir, `download-${+now}`)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
	}

	return DB.conn.tx(t => {
		return t.any(`
			SELECT p.id AS pad_id,
				p.owner AS contributor_id,
				p.title,
				p.date AS created_at,
				p.update_at AS updated_at,
				p.status,
				p.source AS source_pad_id,
				p.template,
				-- p.full_text,  -- FIXME make option to add
				p.sections,

				COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('tag_id', t.tag_id, 'type', t.type))) FILTER (WHERE t.tag_id IS NOT NULL), '[]') AS tags,

				COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('lat', l.lat, 'lng', l.lng, 'iso3', l.iso3))) FILTER (WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL), '[]') AS locations,

				COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('type', m.type, 'name', m.name, 'value', m.value))) FILTER (WHERE m.value IS NOT NULL), '[]') AS metadata,

				COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('type', e.type, 'count', (SELECT count(type) FROM engagement WHERE type = e.type AND docid = p.id )))) FILTER (WHERE e.type IS NOT NULL), '[]') AS engagement,

				COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('message_id', c.id, 'response_to_message_id', c.source, 'user_id', c.contributor, 'date', c.date, 'message', c.message))) FILTER (WHERE c.id IS NOT NULL), '[]') AS comments

			FROM pads p

			LEFT JOIN tagging t
				ON t.pad = p.id

			LEFT JOIN locations l
				ON l.pad = p.id

			LEFT JOIN metafields m
				ON m.pad = p.id

			LEFT JOIN engagement e
				ON e.docid = p.id

			LEFT JOIN comments c
				ON c.docid = p.id

			WHERE TRUE
				$1:raw
				$2:raw
				AND p.id NOT IN (SELECT review FROM reviews)

			GROUP BY (p.id)
			ORDER BY p.id DESC
			$3:raw
		;`, [ full_filters, cors_filter, page_filter ])
		.then(async pads => {
			// GET THE LIST OF PAD ids
			const padIds = pads.map(d => d.pad_id);
			// JOIN THE USER INFORMATION
			pads = await join.users(pads, [ language, 'contributor_id' ]);
			// AND DELETE ALL THE PERSONAL INFORMATION
			pads.forEach(d => {
				d.source = `${host}/en/view/pad?id=${d.pad_id}` // ADD LINK TO SOURCE PAD
				delete d.position
				delete d.ownername
				delete d.rights
			});

			let contributor_list = array.unique.call(pads, { key: 'contributor_id', onkey: true })
			contributor_list = array.shuffle.call(contributor_list)

			const open = pads.every(d => d.status > 2)

			// IF SOURCES ARE REQUESTED, CREATE A NEW OBJECT WITH THE BASIC INFORMATION ABOUT THE SOURCE
			if (include_source) {
				const sources = await t.any(`
					SELECT p.id AS source_pad_id,
						p.owner AS contributor_id,
						p.title,
						p.date AS created_at,
						p.update_at AS updated_at,
						p.status,
						p.template,
						p.sections,

						COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('tag_id', t.tag_id, 'type', t.type))) FILTER (WHERE t.tag_id IS NOT NULL), '[]') AS tags,

						COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('lat', l.lat, 'lng', l.lng, 'iso3', l.iso3))) FILTER (WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL), '[]') AS locations,

						COALESCE(jsonb_agg(DISTINCT (jsonb_build_object('type', m.type, 'name', m.name, 'value', m.value))) FILTER (WHERE m.value IS NOT NULL), '[]') AS metadata

					FROM pads p

					LEFT JOIN tagging t
						ON t.pad = p.id

					LEFT JOIN locations l
						ON l.pad = p.id

					LEFT JOIN metafields m
						ON m.pad = p.id

					WHERE p.id IN ($1:csv)
					GROUP BY (p.id)
				;`, [ safeArr(pads.map(d => d.source_pad_id).filter(d => d), -1) ])
				.then(async sources => {

					let source_contributor_list = array.unique.call(sources, { key: 'contributor_id', onkey: true })
					source_contributor_list = array.shuffle.call(source_contributor_list)

					contributor_list = array.unique.call(contributor_list.concat(source_contributor_list))

					const data = await Promise.all(sources.map(async d => {
						// ANONYMIZE CONTRIBUTORS
						// NOTE THIS id IS DISSOCIATED FROM COMMENTS
						d.contributor_id = `c-${contributor_list.indexOf(d.contributor_id) + 1}`

						// GET SNIPPET
						d.snippet = parsers.getTxt(d)?.[0]
						if (app_storage) {
							const vignette_path = parsers.getImg(d, true)?.[0]
							if (vignette_path) d.vignette = new URL(path.join(new URL(app_storage).pathname, vignette_path), app_storage).href
							else d.vignette = null
						}
						// SET TAGS WITH NAMES
						if (include_tags) {
							const nest = array.nest.call(d.tags, { key: 'type' })
						 	const tags = await Promise.all(nest.map(d => {
								return (async () => {
									const tags = await join.tags(d.values, [ language, 'tag_id', d.key ])
									tags?.forEach(d => {
										// delete d.tag_id
										delete d.equivalents
									})
									return tags
								})()
							}))
							d.tags = tags.flat()
						} else delete d.tags

						if (!include_locations) delete d.locations
						if (!include_metafields) delete d.metadata

						delete d.sections

						return { source_pad_id: d.source_pad_id, source: d }
					}))
					return data
				}).catch(err => console.log(err))

				// JOIN THE SOURCES TO THE PADS
				pads = join.multijoin.call(pads, [ sources, 'source_pad_id' ])
			}
			// IF ENGAGEMENT IS REQUESTED, JOIN PAGE VIEWS
			if (include_engagement) {
				const dbId = await ownDB();
				const pageviews = await DB.general.any(`
					SELECT doc_id AS pad_id, COALESCE(jsonb_build_object('views', COALESCE(view_count, 0), 'reads', COALESCE(read_count, 0)), '{}') AS views
					FROM page_stats
					WHERE doc_type = 'pad'
						AND doc_id IN ($1:csv)
						AND db = $2
				;`, [ padIds, dbId ])
				.catch(err => console.log(err));

				// JOIN THE PAGE VIEWS TO THE PADS
				pads = join.multijoin.call(pads, [ pageviews, 'pad_id' ]);
			}

			if (use_templates) {
				pads = array.nest.call(pads, { key: 'template' })
			} else {
				pads = [{ key: 0, values: pads }]
			}

			pads = await Promise.all(pads.map(pad_group => {
				return (async () => {
					if (include_imgs) {
						pad_group.values.forEach(d => {
							// GET THE MEDIA ITEMS
							d.media = parsers.getImg(d, false)
						})
						var imgs = pad_group.values.map(d => {
							return d.media?.map(c => {
								const obj = {}
								obj.pad_id = d.pad_id
								obj.image = c
								return obj
							})
						}).flat().filter(d => d)
					}

					pad_group.values = await Promise.all(pad_group.values.map(d => {
						return (async () => {
							// ANONYMIZE CONTRIBUTORS
							// NOTE THIS id IS DISSOCIATED FROM COMMENTS
							d.contributor_id = `c-${contributor_list.indexOf(d.contributor_id) + 1}`

							// GET SNIPPET
							d.snippet = parsers.getTxt(d)?.[0]
							if (app_storage) {
								const vignette_path = parsers.getImg(d, true)?.[0]
								if (vignette_path) d.vignette = new URL(path.join(new URL(app_storage).pathname, vignette_path), app_storage).href
								else d.vignette = null
							}
							// SET TAGS WITH NAMES
							if (include_tags) {
								const nest = array.nest.call(d.tags, { key: 'type' })
							 	const tags = await Promise.all(nest.map(d => {
									return (async () => {
										const tags = await join.tags(d.values, [ language, 'tag_id', d.key ])
										tags?.forEach(d => {
											// delete d.tag_id
											delete d.equivalents
										})
										return tags
									})()
								}))
								d.tags = tags.flat()
							} else delete d.tags

							// SET LOCATIONS
							if (!include_locations) delete d.locations

							// SET IMAGES
							if (include_imgs) {
								d.media = d.media?.map(c => {
									if (parsers.isURL(c)) return c
									else {
										const idx = imgs.findIndex(b => b.image === c)
										if (render) { // && fs.existsSync(path.join(rootpath, `/public${c.replace('uploads/sm', 'uploads')}`))) {
											return `images/pad-${d.pad_id}/image-${idx + 1}${path.extname(c)}`
										} else {
											if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
												return new URL(path.join(new URL(app_storage).pathname, c), app_storage).href
											} else return new URL(c, host)?.href
											// } else return path.join(host, c)
										}
									}
								})

							}

							// SET METAFIELDS
							// if (include_attachments) {
							// 	d.attachments = parsers.getAttachments(d)
							// }
							if (!include_metafields) delete d.metadata

							// SET ENGAGEMENT
							if (!include_engagement) delete d.engagement

							// ANONYMIZE COMMENTERS
							if (include_comments) {
								let commenter_list = array.unique.call(pad_group.values.map(d => d.comments).flat(), { key: 'user_id', onkey: true })
								commenter_list = array.shuffle.call(commenter_list)

								d.comments.forEach(c => {
									c.user_id = `u-${commenter_list.indexOf(c.user_id) + 1}`
								})
							} else delete d.comments

							// SET MAIN DATA
							if (!include_data) delete d.sections

							return d
						})()
					}))

					if (output === 'geojson') {
						pad_group.values = pad_group.values.map(d => {
							const { locations, ...properties } = d
							return d.locations.map(c => {
								return turf.point([c.lng, c.lat], properties)
							})
						}).flat()
					}

					// RENDER THE FILES
					if (render) {
						if (use_templates) {
							const template_dir = path.join(dir, `${app_title_short}_template_${pad_group.key}`)
							if (!fs.existsSync(template_dir)) fs.mkdirSync(template_dir)

							if (include_imgs && imgs.length > 0) {
								const img_dir = path.join(template_dir, 'images')
								if (!fs.existsSync(img_dir)) fs.mkdirSync(img_dir)

								if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
									// SEE HERE: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-download-javascript
									// ESTABLISH THE CONNECTION TO AZURE
									const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
									const containerClient = blobServiceClient.getContainerClient(app_title_short)

									await Promise.all(imgs.map((d, i) => {
										return (async () => {
											const img_pad_dir = path.join(img_dir, `pad-${d.pad_id}`)
											if (!fs.existsSync(img_pad_dir)) fs.mkdirSync(img_pad_dir)

											try {
												const blobClient = containerClient.getBlobClient(`${d.image.replace('/uploads/sm', 'uploads')}`)
												await blobClient.downloadToFile(path.join(img_pad_dir, `image-${i + 1}${path.extname(d.image)}`))
											} catch(err) { console.log(err) }
										})()
									}))
								} else {
									imgs.forEach((d, i) => {
										const img_pad_dir = path.join(img_dir, `pad-${d.pad_id}`)
										if (!fs.existsSync(img_pad_dir)) fs.mkdirSync(img_pad_dir)
										try {
											fs.copyFileSync(path.join(rootpath, `/public${d.image.replace('uploads/sm', 'uploads')}`), path.join(img_pad_dir, `image-${i + 1}${path.extname(d.image)}`), fs.constants.COPYFILE_EXCL)
										} catch(err) { console.log(err) }
									})
								}
							}

							fs.writeFileSync(path.join(template_dir, 'data.json'), JSON.stringify(pad_group.values))
						} else {
							if (include_imgs && imgs.length > 0) {
								const img_dir = path.join(dir, 'images')
								if (!fs.existsSync(img_dir)) fs.mkdirSync(img_dir)

								if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
									// SEE HERE: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-download-javascript
									// ESTABLISH THE CONNECTION TO AZURE
									const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
									const containerClient = blobServiceClient.getContainerClient(app_title_short)

									await Promise.all(imgs.map((d, i) => {
										return (async () => {
											const img_pad_dir = path.join(img_dir, `pad-${d.pad_id}`)
											if (!fs.existsSync(img_pad_dir)) fs.mkdirSync(img_pad_dir)

											try {
												const blobClient = containerClient.getBlobClient(`${d.image.replace('/uploads/sm', 'uploads')}`)
												await blobClient.downloadToFile(path.join(img_pad_dir, `image-${i + 1}${path.extname(d.image)}`))
											} catch(err) { console.log(err) }
										})()
									}))
								} else {
									imgs.forEach((d, i) => {
										const img_pad_dir = path.join(img_dir, `pad-${d.pad_id}`)
										if (!fs.existsSync(img_pad_dir)) fs.mkdirSync(img_pad_dir)
										try {
											fs.copyFileSync(path.join(rootpath, `/public${d.image.replace('uploads/sm', 'uploads')}`), path.join(img_pad_dir, `image-${i + 1}${path.extname(d.image)}`), fs.constants.COPYFILE_EXCL)
										} catch(err) { console.log(err) }
									})
								}
							}

							fs.writeFileSync(path.join(dir, `${app_title_short}_data.json`), JSON.stringify(pad_group.values))
						}
					}
					return pad_group
				})()
			}))
			return [ open, pads.map(d => d.values).flat() ];
		}).catch(err => console.log(err))
	}).then(results => {
		const [ open, data ] = results
		console.log(`is open: ${open}`)
		if (render) {
			let zip;
			if (open) zip = spawn('zip',[ '-r', 'archive.zip', path.relative(basedir, dir) ], { cwd: basedir })
			else zip = spawn('zip',[ '-r', 'archive.zip', path.relative(basedir, dir) ], { cwd: basedir })
			// zip.stdin.on('data', d => { console.log(`stdin: ${d}`) })
			zip.stdout.on('data', d => console.log(`stdout: ${d}`))
			zip.stderr.on('data', d => console.log(`stderr: ${d}`))
			// zip.on('error', err => console.log(err))
			zip.on('exit', code => {
				console.log(`zipped: ${code}`)
				fs.rmSync(dir, { recursive: true })
				console.log('folder removed')
				// DOWNLOAD THE FILE
				res.setHeader('Content-type','application/zip')
				res.sendFile(path.join(basedir, '/archive.zip'), {}, function () {
					fs.rmSync(path.join(basedir, '/archive.zip'))
				})
			})
		} else {
			if (token) req.session.destroy() // THIS IS TO PREVENT EXTERNAL CALLS TO THE API FROM LOGGING IN
			if (data.length) res.json(data)
			else res.status(400).json({ message: 'Sorry you do not have the rights to download this content. Please enquire about getting an access token to view download this content.' })
		}
	}).catch(err => console.log(err))
}
