const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
// const rootpath = path.resolve(__dirname, '../..')
// global.include = path => require(`${rootpath}/${path}`)

const XLSX = require('xlsx') // SEE HERE: https://www.npmjs.com/package/xlsx
const { BlobServiceClient } = require('@azure/storage-blob')

const { app_title_short, app_storage, metafields, media_value_keys, DB } = include('config/')
const { checklanguage, array, join, parsers, flatObj, safeArr } = include('routes/helpers/')

const filter = include('routes/browse/pads/filter')

module.exports = async (req, res) => {
	const { action } = req.params || {}
	let { output, render, use_templates, include_data, include_imgs, include_tags, include_locations, include_metafields, include_engagement, include_comments, transpose_locations } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	if (typeof use_templates === 'string') use_templates = JSON.parse(use_templates)
	if (typeof include_data === 'string') include_data = JSON.parse(include_data)
	if (typeof include_locations === 'string') include_locations = JSON.parse(include_locations)
	if (typeof include_tags === 'string') include_tags = JSON.parse(include_tags	)
	if (action === 'fetch') include_data = true

	const pw = req.session.email || null
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)

	const [ f_space, order, page, full_filters ] = await filter(req, res)
	let cors_filter = ''
	if (!pw) cors_filter = DB.pgp.as.format(`AND p.status > 2`)

	if (output === 'csv') {
		var single_sheet = true
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

	DB.conn.tx(t => {
		return t.any(`
			SELECT p.id AS pad_id,
				p.owner AS contributor_id,
				p.title,
				p.date AS created_at,
				p.update_at AS updated_at,
				p.status,
				p.source AS source_pad_id,
				p.template,
				p.full_text,
				p.sections
			FROM pads p

			WHERE TRUE
				$1:raw
				$2:raw
				AND p.id NOT IN (SELECT review FROM reviews)

			ORDER BY id DESC
		;`, [ full_filters, cors_filter ]).then(async pads => {
			// JOIN THE USER INFOR FOR COUNTRY NAMES
			pads = await join.users(pads, [ language, 'contributor_id' ])
			// AND DELETE ALL THE PERSONAL INFORMATION
			pads.forEach(d => {
				delete d.position
				delete d.ownername
			})

			let contributor_list = array.unique.call(pads, { key: 'contributor_id', onkey: true })
			contributor_list = array.shuffle.call(contributor_list)


			const open = pads.every(d => d.status > 2)

			if (use_templates) {
				pads = array.nest.call(pads, { key: 'template' })
			} else {
				pads = [{ key: 0, values: pads }]
			}

			const batch = pads.map(pad_group => {
				return t.task(t1 => {
					const batch1 = []
					const ids = safeArr(pad_group.values.map(d => d.pad_id), -1)
					if (include_tags) {
						batch1.push(t1.any(`
							SELECT pad AS pad_id, tag_id, type FROM tagging
							WHERE pad IN ($1:csv)
							ORDER BY (pad, type)
						;`, [ ids ]).then(async results => {
							const nest = array.nest.call(results, { key: 'type' })
							const tags = await Promise.all(nest.map(async d => {
								const tags = await join.tags(d.values, [ language, 'tag_id', d.key ])
								tags.forEach(d => {
									delete d.tag_id
									delete d.equivalents
								})
								return tags;
							}));

							return tags.flat().sort((a, b) => a.pad_id - b.pad_id);
						}).catch(err => console.log(err)))
					} else batch1.push(null)
					if (include_locations && metafields.some((d) => d.type === 'location')) {
						batch1.push(t1.any(`
							SELECT pad AS pad_id, lat, lng, iso3 FROM locations
							WHERE pad IN ($1:csv)
							ORDER BY pad
						;`, [ ids ]).then(async results => {
							return await join.locations(results, { language, key: 'iso3' })
						}).catch(err => console.log(err)))
					} else batch1.push(null)
					if (include_metafields) {
						batch1.push(t1.any(`
							SELECT pad AS pad_id, type, name, key, value FROM metafields
							WHERE pad IN ($1:csv)
							ORDER BY pad
						;`, [ ids ]))
					} else batch1.push(null)
					if (include_engagement) {
						batch1.push(t1.any(`
							SELECT docid AS pad_id, type, count(type) FROM engagement
							WHERE doctype = 'pad'
								AND docid IN ($1:csv)
							GROUP BY (docid, type)
							ORDER BY docid
						;`, [ ids ]))
					} else batch1.push(null)
					if (include_comments) {
						batch1.push(t1.any(`
							SELECT docid AS pad_id, id AS message_id, source AS response_to_message_id, contributor AS user_id, date, message FROM comments
							WHERE doctype = 'pad'
								AND docid IN ($1:csv)
							ORDER BY (docid, id, source)
						;`, [ ids ]))
					} else batch1.push(null)
					return t1.batch(batch1)
					.then(async results => {
						const [ tags, locations, metadata, engagement, comments ] = results

						const wb = XLSX.utils.book_new()

						if (include_data) {
							// ADD MAIN PAD TO WORKBOOK

							// DETERMINE MAX ENTRIES
							if (include_imgs) {
								pad_group.values.forEach(d => {
									d.img = parsers.getImg(d, false)
								})
								var max_imgs = Math.max(...pad_group.values.map(d => d.img?.length ?? 0))

								var imgs = pad_group.values.map(d => {
									return d.img?.map(c => {
										const obj = {}
										obj.pad_id = d.pad_id
										obj.image = c
										return obj
									})
								}).flat().filter(d => d)
							}
							// DETERMINE MAX TAGS BY TYPE
							if (include_tags) {
								// TO DO: UPDATE THIS TO type-name
								const tag_types = array.unique.call(tags, { key: 'type', onkey: true })
								const tag_counts = array.nest.call(tags, { key: 'pad_id' })
									.map(d => {
										return array.nest.call(d.values, { key: 'type' })
									}).flat()
								var max_tags = tag_types.map(d => {
									const obj = {}
									obj.type = d
									obj.max = Math.max(...tag_counts.filter(c => c.key === d).map(c => c.count))
									return obj
								})
							}
							// DETERMINE MAX LOCATIONS
							if (include_locations) {
								var max_locations = array.nest.call(locations, { key: 'pad_id' })?.map(d => d.count)
								if (max_locations.length) max_locations = Math.max(...max_locations)
								else max_locations = 0
							}
							// EXTRACT METAFIELDS AND DETERMINE MAX METAFIELDS
							if (include_metafields) {
								const meta_types = array.unique.call(metadata, { key: d => `${d.type}-${d.name}`, onkey: true })
								const meta_counts = array.nest.call(metadata, { key: 'pad_id' })
									.map(d => {
										return array.nest.call(d.values, { key: c => `${c.type}-${c.name}` })
									}).flat()
								var max_metafields = meta_types.map(d => {
									const obj = {}
									obj.type = d
									obj.max = Math.max(...meta_counts.filter(c => c.key === d).map(c => c.count))
									return obj
								})

								// var attachments = pad_group.values.map(d => parsers.getAttachments(d).map(c => { return { pad_id: d.pad_id, resource: c } }))
								// var max_attachments = Math.max(...attachments.map(d => d.length))
							}


							if (use_templates) {
								// FLATTEN CONTENT
								function create_id (d, id_prefix, name_prefix) {
									let id;
									let name;
									if (Array.isArray(d)) {
										id = id_prefix.toString().trim()
										name = name_prefix.toString().trim()
									} else if (d.type === 'section') {
										id = `${id_prefix ? `${id_prefix.toString().trim()}--` : ''}${d.type?.toString().trim() ?? undefined}-${d.title?.toString().trim() ?? undefined}-${d.lead?.toString().trim() ?? undefined}`
										name = `${name_prefix ? `${name_prefix}--` : ''}${d.title ?? undefined}`
									} else if (d.type === 'group') {
										id = `${id_prefix ? `${id_prefix.toString().trim()}--` : ''}${d.level?.toString().trim() ?? undefined}-${d.type?.toString().trim() ?? undefined}-${d.name?.toString().trim() ?? undefined}-${d.instruction?.length ? d.instruction?.toString().trim() : undefined}`
										name = `${name_prefix ? `${name_prefix.toString().trim()}--` : ''}${d.instruction?.length ? d.instruction?.toString().trim() : undefined}`
									} else {
										id = `${id_prefix ? `${id_prefix.toString().trim()}--` : ''}${d.level?.toString().trim() ?? undefined}-${d.type?.toString().trim() ?? undefined}-${d.instruction?.length ? d.instruction?.toString().trim() : undefined}`
										name = `${name_prefix ? `${name_prefix.toString().trim()}--` : ''}${d.instruction?.length ? d.instruction?.toString().trim() : undefined}`
									}

									return [ id, name ]
								}
								function check_for_items (items, pad_id, id_prefix, name_prefix, structure = []) {
									items?.forEach(d => {
										let [ cid, cname ] = create_id(d, id_prefix, name_prefix)
										cname = cname.replace(/[\n\s+]/g, ' ').replace(/^(undefined\-+)+/, '')
										if (!['section', 'group'].includes(d.type) && !Array.isArray(d)) {
											if (d.type === 'checklist') {
												d.options?.forEach(c => {
													const obj = {}
													obj.id = `${cid}--${c.name?.toString().trim()}`
													obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
													obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${c.name?.toString().trim()}`

													obj.content = c.checked
													structure.push(obj)
												})
											} else if (d.type === 'radiolist') {
												const opt = d.options.find(c => c.checked)
												const obj = {}
												obj.id = cid
												obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
												obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}`

												obj.content = opt?.name ?? null
												structure.push(obj)
											} else if (include_locations && d.type === 'location') {
												for (let i = 0; i < max_locations; i ++) {
													const obj = {}
													obj.id = `${cid}--${i}`
													obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
													obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${i + 1}`

													if (d.centerpoints?.[i]) obj.content = `${d.centerpoints[i]?.lat}, ${d.centerpoints[i]?.lng}`
													else obj.content = null
													structure.push(obj)
												}
											} else if (include_tags && ['index', 'tag'].includes(d.type)) {
												const max = max_tags.find(c => c.type === d.name)?.max ?? 0

												// d.tags?.forEach((c, i) => {
												// 	const obj = {}
												// 	obj.id = `${cid}--${i}`
												// 	obj.repetition = structure.some(c => c.id === cid) ? structure.filter(c => c.id === cid).length : 0
												// 	obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${i}`

												// 	obj.content = c.name ?? null
												// 	structure.push(obj)
												// })

												for (let i = 0; i < max; i ++) {
													const obj = {}
													obj.id = `${cid}--${i}`
													obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
													obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${i + 1}`

													obj.content = d.tags?.[i]?.name ?? null
													structure.push(obj)
												}
											} else if (include_metafields && metafields.filter(c => !['tag', 'index', 'location'].includes(c.type)).some(c => c.type === d.type && c.name === d.name)) {
												const max = max_metafields.find(c => c.type === `${d.type}-${d.name}`)?.max ?? 0

												// for (let i = 0; i < max_attachments; i ++) {
												// 	const obj = {}
												// 	obj.id = `${cid}--${i}`
												// 	obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
												// 	obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${i + 1}`

												// 	obj.content = d.srcs[i] ?? null
												// 	structure.push(obj)
												// }

												for (let i = 0; i < max; i ++) {
													const valuekey = Object.keys(d).find(c => media_value_keys.includes(c))
													let value = d[valuekey]

													if (Array.isArray(valuekey) && valuekey === 'options') value = value.filter(c => c.checked === true)

													const obj = {}
													obj.id = `${cid}--${i}`
													obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
													obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}--${i + 1}`

													obj.content = (Array.isArray(value) ? value[i] : value) ?? null
													structure.push(obj)
												}
											} else {
												const obj = {}
												obj.id = cid
												obj.repetition = structure.some(c => c.id === obj.id) ? structure.filter(c => c.id === obj.id).length : 0
												obj.name = `${obj.repetition > 0 ? `[${obj.repetition}]--` : ''}${cname}`

												if (d.type === 'title') obj.content = d.txt
												else if (include_imgs && d.type === 'img') {
													if (d.src) {
														const idx = imgs.findIndex(c => c.image === d.src.replace('uploads', '/uploads/sm'))
														if (include_imgs && fs.existsSync(path.join(rootpath, `/public/${d.src}`))) {
															obj.content = `images/pad-${pad_id}/image-${idx + 1}${path.extname(d.src)}`
														} else obj.content = d.src
													}
												}
												else if (include_imgs && d.type === 'mosaic') {
													if (d.srcs?.length) {
														obj.content = d.srcs.map(c => {
															const idx = imgs.findIndex(b => b.image === c.replace('uploads', '/uploads/sm'))
															if (include_imgs && fs.existsSync(path.join(rootpath, `/public/${c}`))) {
																return `images/pad-${pad_id}/image-${idx + 1}${path.extname(c)}`
															} else return c
														}).join(', ')
													}
												}
												else if (include_imgs && d.type === 'video') obj.content = d.src
												else if (d.type === 'drawing') obj.content = d.shapes?.join(', ')
												else if (d.type === 'txt') obj.content = d.txt
												else if (d.type === 'embed') obj.content = d.html?.replace(/<[^>]*>/g, '') || d.src // THE replace IS IMPORTANT HERE TO AVOID xml INJECTION IN THE xlsx OUTPUT
												else return false

												if (!obj.content) obj.content = null


												structure.push(obj)
											}
										}

										if (d.items) structure = check_for_items(d.items, pad_id, cid, cname, structure)
										else if (Array.isArray(d)) structure = check_for_items(d, pad_id, cid, cname, structure)
									})
									return structure
								}

								var flat_content = pad_group.values.map(d => {
									const structure = check_for_items(d.sections, d.pad_id)
										.map(c => {
											const obj = {}
											obj[c.name] = c.content
											return obj
										})
									return Object.assign(flatObj.call(structure), { pad_id: d.pad_id })
								})

								const content_lengths = flat_content.map(d => Object.keys(d).length)
								var headers = flat_content.find(d => Object.keys(d).length === Math.max(...content_lengths))
								headers = Object.keys(headers).filter(c => c !== 'pad_id').map(c => c.trim())
							}

							const data = pad_group.values.map(d => {
								let { ...obj } = d

								// ANONYMIZE CONTRIBUTORS
								// NOTE THIS id IS COMMON TO ALL WORKBOOKS (IF SEVERAL ARE GENERATED)
								obj.contributor_id = `c-${contributor_list.indexOf(obj.contributor_id) + 1}`

								obj.snippet = parsers.getTxt(d)?.[0]
								if (app_storage) {
									const vignette_path = parsers.getImg(d, true)?.[0]
									if (vignette_path) obj.vignette = new URL(path.join(new URL(app_storage).pathname, vignette_path), app_storage).href
									else obj.vignette = null
								}
								// FIGURE OUT WHICH CONTENT STRUCTURE TO KEEP
								if (!use_templates) {
									obj.content = obj.full_text?.replace(/<[^>]*>/g, '')
								} else {
									const structure = flat_content.find(c => c.pad_id === obj.pad_id)
									headers.forEach(c => {
										obj[c] = structure[c] ?? null
									})
								}
								delete obj.full_text
								delete obj.sections

								// EXTRACT IMAGES
								if (single_sheet && include_imgs && !use_templates) {
									if (Array.isArray(obj.img)) {
										for (let i = 0; i < max_imgs; i ++) {
											if (obj.img[i]) {
												const idx = imgs.findIndex(c => c.image === obj.img[i])
												if (fs.existsSync(path.join(rootpath, `/public${obj.img[i].replace('uploads/sm', 'uploads')}`))) obj[`media-${i + 1}`] = `images/pad-${obj.pad_id}/image-${idx + 1}${path.extname(obj.img[i])}`
												else obj[`media-${i + 1}`] = obj.img[i]
											}
										}
									}
								}
								delete obj.img

								if (single_sheet && include_locations && metafields.some((d) => d.type === 'location')) {
									const pad_locations = locations.filter(c => c.pad_id === obj.pad_id)
									if (transpose_locations) {
										if (pad_locations.length === 1) {
											const { lat, lng, iso3, country } = pad_locations[0];
											obj[`location-1-lat`] = lat;
											obj[`location-1-lng`] = lng;
											obj[`location-1-iso3`] = iso3;
											obj[`location-1-country`] = country;
										} else if (pad_locations.length > 1) {
											const subobjs = pad_locations.map(c => {
												let subobj = Object.assign({}, obj)
												const { lat, lng, iso3, country } = c;
												subobj[`location-1-lat`] = lat;
												subobj[`location-1-lng`] = lng;
												subobj[`location-1-iso3`] = iso3;
												subobj[`location-1-country`] = country;
												return subobj;
											})
											obj = subobjs;
										}
									} else {
										for (let i = 0; i < max_locations; i++) {
											// if (pad_locations[i]) {
												const { lat, lng, iso3, country } = pad_locations[i] || {};
												obj[`location-${i + 1}-lat`] = lat;
												obj[`location-${i + 1}-lng`] = lng;
												obj[`location-${i + 1}-iso3`] = iso3;
												obj[`location-${i + 1}-country`] = country;
											// }
										}
									}
								}

								if (single_sheet && include_tags) {									
									max_tags.forEach(c => {
										const pad_tags = tags.filter(b => b.pad_id === d.pad_id && b.type === c.type);
										for (let i = 0; i < c.max; i++) {
											obj[`${c.type}-tag-${i + 1}`] = pad_tags[i]?.name;
										}
									})
								}

								return obj;
							}).flat()

							/*
							pad_group.values.forEach(d => {
								// ANONYMIZE CONTRIBUTORS
								// NOTE THIS id IS COMMON TO ALL WORKBOOKS (IF SEVERAL ARE GENERATED)
								d.contributor_id = `c-${contributor_list.indexOf(d.contributor_id) + 1}`

								d.snippet = parsers.getTxt(d)?.[0]
								if (app_storage) {
									const vignette_path = parsers.getImg(d, true)?.[0]
									if (vignette_path) d.vignette = new URL(path.join(new URL(app_storage).pathname, vignette_path), app_storage).href
									else d.vignette = null
								}
								// FIGURE OUT WHICH CONTENT STRUCTURE TO KEEP
								if (!use_templates) {
									d.content = d.full_text?.replace(/<[^>]*>/g, '')
								} else {
									const structure = flat_content.find(c => c.pad_id === d.pad_id)
									headers.forEach(c => {
										d[c] = structure[c] ?? null
									})
								}
								delete d.full_text
								delete d.sections

								// EXTRACT IMAGES
								if (single_sheet && include_imgs && !use_templates) {
									if (Array.isArray(d.img)) {
										for (let i = 0; i < max_imgs; i ++) {
											if (d.img[i]) {
												const idx = imgs.findIndex(c => c.image === d.img[i])
												if (fs.existsSync(path.join(rootpath, `/public${d.img[i].replace('uploads/sm', 'uploads')}`))) d[`media-${i + 1}`] = `images/pad-${d.pad_id}/image-${idx + 1}${path.extname(d.img[i])}`
												else d[`media-${i + 1}`] = d.img[i]
											}
										}
									}
								}
								delete d.img

								if (single_sheet && include_locations) {
									const pad_locations = locations.filter(c => c.pad_id === d.pad_id)
									for (let i = 0; i < max_locations; i ++) {
										// if (transpose_locations) {

										// }

										else if (pad_locations[i]) {
											const { lat, lng } = pad_locations[i]
											d[`location-${i + 1}-lat`] = lat
											d[`location-${i + 1}-lng`] = lng
										}
									}
								}
							})
							*/

							// const data_sheet = XLSX.utils.json_to_sheet(pad_group.values)
							const data_sheet = XLSX.utils.json_to_sheet(data)
							XLSX.utils.book_append_sheet(wb, data_sheet, 'data-main')

							// ADD IMAGES TO WORKBOOK
							// THIS COMES HERE, UNLIKE THE tags, locations, etc
							// BECAUSE IT IS CONSIDERED DATA (NOT METADATA), AND IS PART OF THE PACKAGE OF DATA
							if (!single_sheet && include_imgs) {
								if (imgs?.length) {
									const imgs_data = imgs.map((d, i) => {
										const obj = {}
										obj.pad_id = d.pad_id
										if (fs.existsSync(path.join(rootpath, `/public${d.image.replace('uploads/sm', 'uploads')}`))) obj.image = `images/pad-${d.pad_id}/image-${i + 1}${path.extname(d.image)}`
										else obj.image = d.image
										return obj
									})
									const imgs_sheet = XLSX.utils.json_to_sheet(imgs_data)
									XLSX.utils.book_append_sheet(wb, imgs_sheet, 'data-media')
								}
							}
						}

						if (!single_sheet && tags?.length) {
							// ADD TAGS TO WORKBOOK
							console.log('second instance')
							console.log(tags)

							tags.forEach(d => {
								d.type = metafields.find(c => c.label === d.type)?.name ?? d.type
							})

							const tags_sheet = XLSX.utils.json_to_sheet(tags)
							XLSX.utils.book_append_sheet(wb, tags_sheet, 'metadata-tags')
						}
						if (!single_sheet && locations?.length) {
							// ADD LOCATIONS TO WORKBOOK
							const locations_sheet = XLSX.utils.json_to_sheet(locations)
							XLSX.utils.book_append_sheet(wb, locations_sheet, 'metadata-locations')
						}
						// if (!single_sheet && attachments?.flat().length) {
							// const consent_sheet = XLSX.utils.json_to_sheet(attachments.flat())
						if (!single_sheet && metadata?.length) {
							const consent_sheet = XLSX.utils.json_to_sheet(metadata)
							XLSX.utils.book_append_sheet(wb, consent_sheet, 'metadata-other')
						}
						if (!single_sheet && engagement?.length) {
							// ADD ENGAGEMENT TO WORKBOOK
							const engagement_sheet = XLSX.utils.json_to_sheet(engagement)
							XLSX.utils.book_append_sheet(wb, engagement_sheet, 'metadata-engagement')
						}
						if (!single_sheet && comments?.length) {
							// ADD COMMENTS TO WORKBOOK
							// NOTE THIS IS UNIQUE TO EACH WORKBOOK, WHEREAS THE contributor_list IS COMMON TO ALL WORKBOOKS
							let commenter_list = array.unique.call(comments, { key: 'user_id', onkey: true })
							commenter_list = array.shuffle.call(commenter_list)

							comments.forEach(d => {
								// ANONYMIZE CONTRIBUTORS
								d.user_id = `u-${commenter_list.indexOf(d.user_id) + 1}`
							})
							const comments_sheet = XLSX.utils.json_to_sheet(comments)
							XLSX.utils.book_append_sheet(wb, comments_sheet, 'metadata-comments')
							// XLSX.utils.sheet_to_csv(ws)
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

								if (single_sheet) XLSX.writeFile(wb, path.join(template_dir, 'data.csv'), {})
								else XLSX.writeFile(wb, path.join(template_dir, 'data.xlsx'), {})
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

								if (single_sheet) XLSX.writeFile(wb, path.join(dir, `${app_title_short}_data.csv`), {})
								else XLSX.writeFile(wb, path.join(dir, `${app_title_short}_data.xlsx`), {})
							}
						}


						// if (include_data) return pad_group.values
						if (include_data) return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
						else return null
					}).catch(err => console.log(err))
				}).catch(err => console.log(err))
			})

			return t.batch(batch)
			.then(results => {
				return [ open, results ]
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).then(results => {
		const [ open, data ] = results
		console.log(`is open: ${open}`)
		if (render) {
			let zip;
			if (open) zip = spawn('zip',[ '-r', 'archive.zip', path.relative(basedir, dir) ], { cwd: basedir })
			else zip = spawn('zip',[ '-r', 'archive.zip', path.relative(basedir, dir) ], { cwd: basedir })
			// zip.stdin.on('data', (data) => { console.log(`stdin: ${data}`) })
			zip.stdout.on('data', data => console.log(`stdout: ${data}`))
			zip.stderr.on('data', data => console.log(`stderr: ${data}`))
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
			req.session.destroy() // THIS IS TO PREVENT EXTERNAL CALLS TO THE API FROM LOGGING IN

			if (data.length) res.send(data[0].replace(/\n/g, '<br/>'))
			else res.send('Sorry you do not have the rights to download this content. Please enquire about getting an access token to view download this content.')
		}
	}).catch(err => console.log(err))
}
