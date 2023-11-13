// THIS SCRIPT ONLY NEEDS TO BE RUN FOR THE SM PLATFORM
const { DB } = require('../../../config');
const path = require('path')
const https = require('https')


DB.conn.tx(t => {
	const batch = []
	batch.push(t.any(`
		SELECT id, pad, value FROM metafields
		WHERE name = 'consent'
	;`))
	batch.push(t.any(`
		SELECT id, sections FROM pads
	;`))
	return t.batch(batch)
	.then(results => {
		const [ consent, pads ] = results

		// CONSOLIDATE ATTACHMENT FORMATTING
		pads.forEach(d => {
			d.sections.forEach(c => {
				c.items.forEach(b => {
					if (b.name === 'consent' && b.values) {
						if (b.srcs) {
							b.srcs = b.srcs.concat(b.values.map(a => a.link))
						} else {
							b.srcs = b.values.map(a => a.link)
						}
					}
				})
			})
		})
		// CHECK THAT ALL pads WITH ATTACHED CONSENT FIELD ARE REGISTERED IN consent
		const pads_with_consent = pads.filter(d => {
			return d.sections.some(c => {
				return c.items.some(b => {
					return b.name === 'consent' && b.srcs.some(a => a.includes('https://acclabs-consent-archive.azurewebsites.net'))
				})
			})
		})
		// IF THERE ARE MORE OR LESS PADS THAN CONSENT STORED
		// FIX THE ISSUE
		if (pads_with_consent.unique('id', true).length !== consent.filter(d => d.value.includes('https://acclabs-consent-archive.azurewebsites.net')).unique('pad', true).length) {
			console.log('different number of pads with consent and values stored in the metafields table')
			console.log(pads.length)
			console.log(consent.filter(d => d.value.includes('https://acclabs-consent-archive.azurewebsites.net')).length)
			console.log(pads_with_consent.map(d => d.id).length)
			console.log(pads_with_consent
				.filter(d => 
					!consent.filter(d => d.value.includes('https://acclabs-consent-archive.azurewebsites.net'))
					.some(c => c.pad === d.id)
				)
			)

			pads_with_consent
			.filter(d => 
				!consent.filter(d => d.value.includes('https://acclabs-consent-archive.azurewebsites.net'))
				.some(c => c.pad === d.id)
			).forEach(d => {
				d.sections.forEach(c => {
					c.items.forEach(b => {
						if (b.name === 'consent') {
							console.log(d.id, b)
							console.log('consent equivalent')
							console.log(consent.find(a => a.pad === d.id))
						}
					})
				})
			})
			return 'different number of pads with consent and values stored in the metafields table'
		} else {
			return t.any(`
				SELECT * FROM
				dblink(
					'host=$1:raw port=$2:raw dbname=$3:raw user=$4:raw password=$5:raw sslmode=require', 
					'SELECT f.path, u.uuid, u.name AS username, u.email 
						FROM files f 
						INNER JOIN contributors u 
							ON u.id = f.contributor
				') AS t(path text, uuid uuid, username text, email text)
			;`, [ 
				process.env.CONSENT_DB_HOST, 
				process.env.CONSENT_DB_PORT,
				process.env.CONSENT_DB_NAME,
				process.env.CONSENT_DB_USERNAME,
				process.env.CONSENT_DB_PASSWORD
			])
			.then(archive_data => {
				return DB.general.any(`
					SELECT uuid, name, email FROM users
					WHERE name IN ($1:csv)
						OR email IN ($2:csv)
				;`, [ archive_data.map(d => d.username), archive_data.map(d => d.email) ])
				.then(async users => {
					let new_consent_paths = await Promise.all(consent.map(async d => {
						if (d.value.includes('https://acclabs-consent-archive.azurewebsites.net')) {
							const archive_datum = archive_data.find(c => d.value.includes(c.path))

							const obj = {}
							obj.id = d.id
							obj.pad = d.pad

							if (!archive_datum) {
								console.log('no corresponding archive')
								console.log('missing:')
								console.log(d.value)
								console.log('\n')
								obj.message = 'no corresponding user'
							} else {
								const corresponding_user = users.find(c => c.email === archive_datum.email || c.name === archive_datum.username)
							
								if (!corresponding_user) {
									console.log('no corresponding user')
									console.log(d.value)
									console.log(archive_datum)
									console.log(corresponding_user)
									console.log('\n')
									obj.message = 'no corresponding user'
								} else {
									// UDPATE d.value PATH TO THE BLOB STORAGE CONTAINER
									const blob_path = path.join('https://acclabplatforms.blob.core.windows.net/consent/uploads/', corresponding_user.uuid)
									const filename = d.value.split('/')[d.value.split('/').length - 1]

									const new_value = path.join(blob_path, filename)
									const exists = await checkURL(new_value)
									if (exists) {
										obj.or_value = d.value
										obj.value = new_value
									} else {
										obj.message = 'the file no longer seems to exist'
									}
								}
							}
							return obj
						}
					}))
					new_consent_paths = new_consent_paths.filter(d => d)
					const update_paths = new_consent_paths.filter(d => d.value)

					// DOUBLE CHECK THAT WE HAVE THE SAME NUMBER OF PADS AND NEW CONSENT PATHS
					console.log('outer')
					if (update_paths.length && update_paths.unique('pad', true).length === pads_with_consent.unique('id', true).length) {
						console.log('inner')
						// UPDATE THE metafields TABLE
						const update = `${DB.pgp.helpers.update(update_paths, ['?id', '?pad', 'value'], 'metafields')} WHERE v.id = t.id AND v.pad = t.pad`
						return t.none(update)
						.then(_ => {
							// UPDATE THE PADS
							return t.batch(pads_with_consent.map(d => {
								d.sections.forEach(c => {
									c.items.forEach(b => {
										if (b.name === 'consent') {
											const updates = update_paths.filter(a => a.pad === d.id)
											b.srcs = b.srcs.map(a => {
												if (updates.some(z => z.or_value === a)) {
													return updates.find(z => z.or_value === a).value
												} else {
													console.log('not changing here')
													console.log(a)
													console.log(updates)
													console.log('\n')

													return a
												}
											})
										}
									})
								})
								return t.none(`UPDATE pads SET sections = $1::jsonb WHERE id = $2;`, [ JSON.stringify(d.sections), d.id ])
								// return 'all ok'
							})).catch(err => console.log(err))
						}).catch(err => console.log(err))
					} else return 'diffrent number of pads and new consent urls'

				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}
	}).catch(err => console.log(err))
}).then(results => {
	// console.log(results)
	console.log('done')
}).catch(err => console.log(err))

function checkURL (url) {
	// COPIED FROM https://github.com/nwaughachukwuma/url-exists-nodejs/blob/main/index.js
	const { host, pathname } = new URL(url.trim())
	const opt = { method: 'HEAD', host: host, path: pathname }

	return new Promise((resolve) => {
		const req = https.request(opt, (r) => {
			resolve(/4\d\d/.test(`${r.statusCode}`) === false)
		})
		req.on('error', () => resolve(false))
		req.end()
	})
}
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