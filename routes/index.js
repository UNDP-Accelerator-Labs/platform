const config = require('../config.js')
const DB = require('../db-config.js')
const request = require('request')
const format = require('./formatting.js')
const path = require('path')
const fs = require('fs')
const mime = require('mime')

const Jimp = require('jimp')

const { execFile } = require('child_process')

const fetch = require('node-fetch')
const Pageres = require('pageres')
const d3 = require('d3')
const turf = require('@turf/turf')

const archiver = require('archiver')


const lazyLimit = 25

if (!exports.redirect) { exports.redirect = {} }
if (!exports.render) { exports.render = {} }
if (!exports.process) { exports.process = {} }
if (!exports.public) { exports.public = {} }
if (!exports.private) { exports.private = {} }
if (!exports.dispatch) { exports.dispatch = {} }

const checklanguage = lang => ['en', 'fr', 'es', 'pt'].includes(lang) ? lang : 'en'


exports.forwardGeocoding = (req, res) => {
	const { locations, list } = req.body || {}
	DB.conn.one(`
		SELECT p.lat, p.lng FROM centerpoints cp
		INNER JOIN contributors c
			ON c.country = cp.country
		WHERE c.uuid = $1
	;`, [req.session.uuid])
	.then(centerpoint => {
		const promises = geocode(locations, centerpoint, list)
		Promise.all(promises)
		.then(data => res.json(data))
		.catch(err => {
			console.log(err)
			res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
		})
	}).catch(err => console.log(err))
}
function geocode (locations, centerpoint, list = false, dir = 'forward') { // FOR NOW WE ONLY DO FORWARD GEOCODING
	console.log('pay attention to forward geocode')
	return locations.map(l => {
		return new Promise(resolve => {
			if (!l || typeof l !== 'string') {
				const obj = {}
				obj.found = false
				obj.centerpoint = centerpoint
				obj.caption = `No location was found for <strong>${l}</strong>.`
				resolve(obj)
			} else {
				setTimeout(_ => {
					l_formatted = l.removeAccents().replacePunctuation(', ').trim()
					console.log(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}`)
					fetch(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}&key=${process.env.OPENCAGE_API}`)
					.then(response => response.json())
					.then(data => {
						const obj = {}
						if (data.results.length) {
							if (!list) {
								const location = data.results[0] // NOTE CONFIDENCE IS SOMETHING ELSE: https://opencagedata.com/api#ranking
								obj.centerpoint = { lat: +location.geometry.lat, lng: +location.geometry.lng }
							} else {
								obj.locations = data.results
							}
							obj.found = true
							obj.caption = `<strong>${l.trim().capitalize()}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`
						} else {
							obj.found = false
							obj.centerpoint = centerpoint
							obj.caption = `No location was found for <strong>${l.trim().capitalize()}</strong>.`
						}
						resolve(obj)
					}).catch(err => console.log(err))
				}, 1000)
			}
		})
	})
}









/* =============================================================== */
/* =========================== LOGIN ============================= */
/* =============================================================== */
exports.render.login = (req, res, next) => {
	if (req.session.uuid) next()
	else res.render('login', { title: `${config.title} | Login`, originalUrl: req.originalUrl })
}
exports.process.login = (req, res, next) => { // REROUTE
	const { username, password, originalUrl } = req.body
	if (!username || !password) res.redirect('/login')
	else { 
		DB.conn.oneOrNone(`
			SELECT name, country, uuid, rights, lang FROM contributors
			WHERE (name = $1 OR email = $1)
				AND password = CRYPT($2, password)
		;`, [username, password])
		.then(result => {
			if (result) {
				req.session.uuid = result.uuid
				req.session.username = result.name
				req.session.country = result.country
				req.session.sudo = result.name === 'sudo' // THIS SHOULD BE DEPRECATED
				req.session.rights = result.rights
				if (!result.lang) req.session.lang = 'en'
				else req.session.lang = checklanguage(result.lang)

				res.redirect(originalUrl)

			} else res.redirect('/login')
		})
		.catch(err => console.log(err))
	}
}
exports.process.logout = (req, res) => {
	req.session.destroy()
	res.redirect('/')
}
exports.redirect.home = (req, res, next) => {
	const lang = checklanguage(req.params && req.params.lang ? req.params.lang : req.session.lang)
	if (req.session.uuid) {
		if (req.session.rights > 0) res.redirect(`/${lang}/browse/pads/private`)
		else res.redirect(`/${lang}/browse/pads/public`)
	} else next()
}


// TO DO: REMOVE THIS - IT IS NOW IN header > data.js
function navigationData (kwargs) {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { path, query, headers } = kwargs.req || {}
	path = path.substring(1).split('/')
	const { uuid, username, country, rights } = kwargs.req.session || {}
	let { lang } = kwargs.req.params || kwargs.req.session || {}
	lang = checklanguage(lang)

	// THIS IS PARSING THE QUERY TO SEND IT BACK TO THE CLIENT FOR PROPER DISPLAY IN FILTER MENU
	const parsedQuery = {}
	for (let key in query) {
		if (key === 'query') {
			if (query[key].trim().length) parsedQuery[key] = query[key].trim().toLowerCase().split(' or ').map(d => d.split(' ')).flat() // TO DO: CHECK THIS
		} else {
			if (!Array.isArray(query[key])) parsedQuery[key] = [query[key]]
			else parsedQuery[key] = query[key]
		}
	}

	return conn.any(`
		SELECT mob.id, mob.title, mob.template, 
			to_char(mob.start_date, 'DD Mon YYYY') AS start_date, 
			c.name AS host_name 
		FROM mobilization_contributors mc
		INNER JOIN mobilizations mob
			ON mc.mobilization = mob.id
		INNER JOIN contributors c
			ON mob.host = c.id
		WHERE mc.contributor = (SELECT id FROM contributors WHERE uuid = $1)
			AND mob.status = 1
	;`, [uuid])
	.then(results => {
		return { path: path, originalUrl: headers.referer, uuid: uuid, username: username, country: country, rights: rights, lang: lang, query: parsedQuery, participations: results }
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* =========================== BROWSE ============================ */
/* =============================================================== */
exports.dispatch.browse = require('./browse/')


/* =============================================================== */
/* ========================= MOBILIZE ============================ */
/* =============================================================== */


exports.process.deploy = (req, res) => { // THIS IS EQUIVALENT TO PUBLISH
	let { title, template, cohort } = req.body || {}
	if (title.length > 99) title = `${title.slice(0, 96)}…`
	if (!Array.isArray(cohort)) cohort = [cohort]
	
	const { uuid } = req.session || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	DB.conn.tx(t => { // INSERT THE NEW MOBILIZATION
		return t.one(`
			INSERT INTO mobilizations (title, host, template)
			SELECT $1, c.id, $2 FROM contributors c
				WHERE c.uuid = $3
			RETURNING id
		;`, [title, +template, uuid])
		.then(result => { // INSERT THE COHORT FOR THE MOBILIZATION
			const { id } = result
			const batch = cohort.map(d => {
				return t.none(`
					INSERT INTO mobilization_contributors (contributor, mobilization)
					VALUES ($1, $2)
				;`, [+d, id])
			})
			// ADD THE HOST OF THE MOBIILIZATION BY DEFAULT
			batch.push(t.none(`
				INSERT INTO mobilization_contributors (contributor, mobilization)
				SELECT id, $1 FROM contributors 
					WHERE uuid = $2
			;`, [id, uuid]))
			return t.batch(batch)
		})
	}).then(_ => res.redirect(`/${lang}/browse/mobilization/ongoing`))
	.catch(err => console.log(err))
}
exports.process.demobilize = (req, res) => {
	const { referer } = req.headers || {}
	const { id } = req.query || {}

	// EXECUTE SQL
	DB.conn.none(`
		UPDATE mobilizations 
		SET status = 2,
			end_date = NOW()
		WHERE id = $1
	;`, [id])
	.then(_ => res.redirect(referer))
	.catch(err => console.log(err))
}

exports.dispatch.analyse = (req, res) => {
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	// if (rights > 0)	{
	// 	if (object === 'pad') createPad(req, res)
	// 	else if (object === 'import') createImport(req, res)
	// 	else if (object === 'template') createTemplate(req, res)
	// } else res.redirect(`/${lang}/browse/${object}s/public`)

	if (object === 'mobilization') {
		compileMobilization(req, res)
	}
}
function compileMobilization (req, res) {
	const { id } =  req.query || {}

	DB.conn.tx(t => {
		const batch = []
		batch.push(t.one(`
			SELECT t.sections FROM mobilizations m
			INNER JOIN templates t
				ON m.template = t.id
			WHERE m.id = $1
		;`, [id]))
		// batch.push(t.any(`
		// 	SELECT p.id, p.title, p.sections FROM mobilization_contributions mc
		// 	INNER JOIN pads p
		// 		ON mc.pad = p.id
		// 	WHERE mc.id = $1
		// ;`, [id]))
		batch.push(t.any(`
			SELECT p.id, p.title, p.sections FROM pads p
			WHERE p.id = 134
		;`))
		return t.batch(batch)
	}).then(results => {
		const [ template, pads ] = results
		
		console.log(template.sections)
		pads.forEach(d => console.log(d.id, d.title, d.sections))
		pads.forEach(d => console.log(d.id, d.title, d.sections.map(c => c.structure)))
		pads.forEach(d => console.log(d.id, d.title, d.sections.map(c => c.items)))
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ============================ PADS ============================= */
/* =============================================================== */
exports.dispatch.contribute = require('./contribute/').contribute
// (req, res) => {
// 	const { uuid, rights } = req.session || {}
// 	const { object } = req.params || {}
// 	let { lang } = req.params || req.session || {}
// 	lang = checklanguage(lang)

// 	if (rights > 0)	{
// 		if (object === 'pad') createPad(req, res)
// 		else if (object === 'import') createImport(req, res)
// 		else if (object === 'template') createTemplate(req, res)
// 	} else res.redirect(`/${lang}/browse/${object}s/public`)
// }
exports.dispatch.edit = require('./contribute/').edit
// (req, res) => {
// 	const { id } = req.query || {}
// 	const { uuid, rights } = req.session || {}
// 	const { object } = req.params || {}
// 	let { lang } = req.params || req.session || {}
// 	lang = checklanguage(lang)

// 	if (id) {
// 		DB.conn.any(`
// 			SELECT uuid FROM contributors
// 			WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
// 			AND uuid = $3
// 		;`, [`${object}s`, +id, uuid])
// 		.then(results => {
// 			if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
// 				if (object === 'pad') editPad(req, res)
// 				if (object === 'template') editTemplate(req, res)
// 			} else res.redirect(`/${lang}/view/${object}?id=${id}`)
// 		})
// 	} else res.redirect(`/${lang}/contribute/${object}`)
// }
exports.dispatch.view = require('./contribute/').view
// (req, res) => {
// 	const { id } = req.query || {}
// 	const { uuid, rights } = req.session || {}
// 	const { object } = req.params || {}
// 	let { lang } = req.params || req.session || {}
// 	lang = checklanguage(lang)

// 	if (id) {
// 		DB.conn.any(`
// 			SELECT uuid FROM contributors
// 			WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
// 			AND uuid = $3
// 		;`, [`${object}s`, +id, uuid])
// 		.then(results => {
// 			if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
// 				res.redirect(`/${lang}/edit/${object}?id=${id}`)
// 			} else {
// 				if (object === 'pad') editPad(req, res)
// 				if (object === 'template') editTemplate(req, res)
// 			}
// 		})
// 	} else res.redirect(`/${lang}/contribute/${object}`)
// }

// THIS CAN PROBABLY BE REMOVED
exports.dispatch.preview = (req, res) => {
	const { id } = req.body || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	if (id) {
		// if (object === 'pad') previewPad(req, res)
		if (object === 'template') previewTemplate(req, res)
	} else res.json({ message: 'no id provided' })
}





/* =============================================================== */
/* ========================== TEMPLATES ========================== */
/* =============================================================== */

// THIS CAN PROBABLY BE REMOVED
function previewTemplate (req, res) {
	const { id } = req.body || {}
	
	DB.conn.oneOrNone(`
		SELECT title, description, sections, status, published FROM templates
		WHERE id = $1
	;`, [+id])
	.then(result => {
		res.status(200).json(result)
	}).catch(err => console.log(err))
}

/* =============================================================== */
/* ========================== IMPORT ============================= */
/* =============================================================== */
// THIS IS NOT USED FOR NOW
function createImport (req, res) {
	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.one(`
			SELECT name, country FROM contributors 
			WHERE uuid = $1
		;`, [req.session.uuid]))
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [req.session.uuid]))
		return t.batch(batch)
		.then(results => {
			const [user, centerpoint] = results
			return { 
				title: `${config.title} | Import`, 
				
				path: path,
				user: username,
				rights: rights,
				participations: participations,

				centerpoint: JSON.stringify(centerpoint),

				user: user.name,
				country: user.country,
				lang: lang
			}
		})
	}).then(data => res.render('import', data))
	.catch(err => console.log(err))
}
exports.storeImport = (req, res) => {
	// 1 CREATE AND STORE THE TEMPLATE
	// 2 CREATE AND STORE THE PADS
	let pads = req.body.pads//.slice(0, 3)
	const template = req.body.template
	template.status = 1

	if (template.title.length > 99) template.title = template.title.slice(0, 99)

	// console.log(pads)
	DB.conn.tx(t => {
		const batch = []
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [req.session.uuid]))

		batch.push(t.one(`
			SELECT country FROM contributors WHERE uuid = $1
		`, [req.session.uuid]))
		
		batch.push(t.one(`
			WITH contributor AS (
				SELECT id FROM contributors
				WHERE uuid = $1
			)
			INSERT INTO templates (medium, title, description, sections, full_text, status, contributor)
			SELECT $2, $3, $4, $5, $6, $7, contributor.id FROM contributor
			RETURNING id
		;`, [req.session.uuid, template.medium, template.title, template.description, JSON.stringify(template.sections), template.fullTxt, template.status]))

		if (template.tags) {
			template.tags.forEach(d => {
				batch.push(t.none(`
					INSERT INTO thematic_areas (name)
					VALUES ($1)
						ON CONFLICT ON CONSTRAINT thematic_areas_name_key
						DO NOTHING
				;`, [d.toLowerCase().trim()]))
			})
		}
		return t.batch(batch)
		.then(async results => {
			const [centerpoint, country, template] = results
			
			const promises = pads.map(p => {
				return new Promise(async resolve => {
					// CHECK FOR LOCATIONS
					const item = p.meta.find(d => d.type === 'location')
					if (item && item.locations && item.locations.length) {
						// WE NEED centerpoints AND caption
						const geocoding = await Promise.all(geocode(item.locations, centerpoint))
						// console.log(geocoding)
						p.meta.find(d => d.type === 'location').centerpoints = geocoding.map(d => d.centerpoint)
						p.meta.find(d => d.type === 'location').caption = `Originally input location${item.locations.length > 1 ? 's' : ''}: <strong>${item.locations.map(l => l && typeof l === 'string' ? l.trim().capitalize() : l).join('</strong>, <strong>')}</strong>.<br/>`
						if (geocoding.filter(d => d.found).length > 1) item.caption += `Multiple locations found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`
						else if ((geocoding.filter(c => c.found).length === 1)) item.caption += geocoding.find(d => d.found).caption
						if (geocoding.filter(d => !d.found).length) {
							p.meta.find(d => d.type === 'location').caption += geocoding.filter(c => !c.found).map(d => d.caption).join(' ')
							p.meta.find(d => d.type === 'location').caption += `<br/>Defaulted to UNDP ${country.country} Country Office location.`
						}
						delete item.locations	
					}
					p.fullTxt = `${p.title}\n\n${p.sections.map(d => d.items).flat().filter(d => d.type === 'txt').map(d => d.txt).join('\n\n').trim()}\n\n${p.sections.map(d => d.items).flat().filter(d => d.type === 'checklist').map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}`
					p.location = p.meta.find(d => d.type === 'location')
					p.sdgs = p.meta.find(d => d.type === 'sdgs') ? p.meta.find(d => d.type === 'sdgs').sdgs : null
					if (p.sdgs && !p.sdgs.length) p.sdgs = null
					p.tags = p.meta.find(d => d.type === 'tags') ? p.meta.find(d => d.type === 'tags').tags.map(d => d.name) : null
					if (p.tags && !p.tags.length) p.tags = null
					// p.published = FALSE
					resolve(p)
				})
			})
			
			const data = await Promise.all(promises)
			return t.batch(data.map(d => {
				let status = 0
				if (d.title && d.title.trim().length
					&& d.location && d.location.centerpoints && d.location.centerpoints.length 
					&& d.sdgs && d.sdgs.length && d.sdgs.length <= 5
					&& d.tags && d.tags.length && d.tags.length <= 5
				) status = 1
				// TRUNCATE TITLE IF TOO LONG (THE DB EXPECTS 99 CHARS)
				if (d.title && d.title.length > 99) d.title = d.title.slice(0, 99)

				return t.one(`
					WITH contributor AS (
						SELECT id FROM contributors
						WHERE uuid = $1
					)
					INSERT INTO pads (title, sections, full_text, location, sdgs, tags, template, status, contributor)
					SELECT $2, $3, $4, $5, $6, $7, $8, $9, contributor.id FROM contributor
					RETURNING pads.id
				;`, [req.session.uuid, d.title, JSON.stringify(d.sections), d.fullTxt, JSON.stringify(d.location), JSON.stringify(d.sdgs), JSON.stringify(d.tags), template.id, status])
			}))
		})
	}).then(results => res.json({ pads: results.map(d => d.id) }))
	.catch(err => console.log(err))
}
/* =============================================================== */
/* ====================== SAVING MECHANISMS ====================== */
/* =============================================================== */
exports.process.upload = (req, res) => {
	const fls = req.files
	const promises = fls.map(f => {
		console.log('hello')
		console.log(f)
		return new Promise(resolve => {
			if (['image/png', 'image/jpg', 'image/jpeg', 'image/jfif', 'image/gif', 'application/octet-stream'].includes(f.mimetype)) { // octet-streram IS FOR IMAGE URLs
				const basedir = path.join(__dirname, `../public/uploads/`)
				if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)

				const dir = path.join(basedir, req.session.uuid)
				if (!fs.existsSync(dir)) fs.mkdirSync(dir)
				const smdir = path.join(basedir, 'sm/')
				if (!fs.existsSync(smdir)) fs.mkdirSync(smdir)
				const targetdir = path.join(smdir, req.session.uuid)
				if (!fs.existsSync(targetdir)) fs.mkdirSync(targetdir)

				const source = path.join(__dirname, `../${f.path}`)
				const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const smtarget = path.join(targetdir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				
				// CREATE THE SMALL IMAGE
				Jimp.read(source, (err, image) => {
					if (err) console.log(err)
					const w = image.bitmap.width
					const h = image.bitmap.height
					// CHECK IMAGE ORIENTATION (EXIF)
					// SEE https://www.impulseadventure.com/photo/exif-orientation.html
					if (image._exif && image._exif.tags && image._exif.tags.Orientation) {
						const o = image._exif.tags.Orientation
						if (o === 8) image.rotate(270).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						if (o === 6) image.rotate(90).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						else image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					} else {
						image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					}

					image.quality(60)
					image.writeAsync(smtarget)
					.then(_ => {
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					}).catch(err => {
						fs.copyFileSync(source, smtarget)
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					})
				})
			} else if (f.mimetype.includes('video/')) {
				// TO DO: CHECK SIZE HERE AND IF TOO BIG DO NOTHING (IN FRONT END TELL USER TO GO THROUGH YOUTUBE OF MSSTREAM)
				const basedir = path.join(__dirname, `../public/uploads/`)
				if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)

				const dir = path.join(basedir, req.session.uuid)
				if (!fs.existsSync(dir)) fs.mkdirSync(dir)

				const source = path.join(__dirname, `../${f.path}`)
				// const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const fftarget = path.join(dir, `./ff-${f.filename}${path.extname(f.originalname).toLowerCase()}`)

				execFile('ffmpeg', [
					'-i', source,
					// '-s', '640x480',
					'-b:v', '512k',
					'-c:v', 'libx264',
					'-c:a', 'copy',
					'-vf', 'scale=854:ih*854/iw', // 854 = 480p
					fftarget
				], function(err, stdout, stderr) {
					if (err) console.log(err)

					fs.unlinkSync(source)
					resolve({ status: 200, src: fftarget.split('public/')[1], originalname: f.originalname, message: 'success' })
				})
			} else {
				fs.unlinkSync(source)
				resolve({ status: 403, message: 'wrong file format' })
			}
		})
	})
	Promise.all(promises)
	.then(results => res.json(results))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong.' })
	})
}
exports.process.screenshot = (req, res) => {
	if (process.env.NODE_ENV !== 'production') {
		const src = req.body.src
		const target = src.simplify()

		const basedir = path.join(__dirname, `../public/uploads/`)
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		
		const dir = path.join(__dirname, `../public/uploads/${req.session.uuid}`)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
		
		if (!fs.existsSync(path.join(dir, `${target}.png`))) {
			new Pageres({ delay: 2, filename: target, format: 'png' })
				.src(src, ['1280x1024'])
				.dest(dir)
				.run()
			.then(result => res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'success' }))
			.catch(err => {
				console.log(err)
				res.json({ status: 500, message: 'Oops! Something went wrong.' })
			})
		} else {
			res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'image already exists' })
		}
	}
	else res.json({ status: 200, src: null, message: 'cannot load image in production mode' })
}


// THIS IS THE NEW SAVING MECHANISM
exports.process.save = (req, res) => {
	// CHECK THE PAD EXISTS
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { datasources, deletion, id, mobilization } = req.body || {}
	let saveSQL

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'deletion', 'mobilization', 'datasources'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})
		saveSQL = DB.pgp.as.format(`
			INSERT INTO $1:name ($2:name, contributor) 
			SELECT $2:csv, c.id FROM contributors c
			WHERE c.uuid = $3
			RETURNING $1:name.id
		;`, [`${object}s`, insert, uuid])
	} else { // UPDATE OBJECT
		const condition = DB.pgp.as.format(` WHERE id = $1;`, [id])
		saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'deletion', 'mobilization', 'datasources'].includes(d)), `${object}s`) + condition
	}	

	DB.conn.tx(t => { 
		const batch = []
		if (datasources) {
			JSON.parse(datasources).forEach(d => {
				batch.push(t.none(`
					INSERT INTO datasources (name, contributor)
					SELECT $1, id FROM contributors
					WHERE uuid = $2
						ON CONFLICT ON CONSTRAINT datasources_name_key
						DO NOTHING
				;`, [d.toLowerCase(), uuid]))
			})
		}
		batch.push(t.oneOrNone(saveSQL))
		return t.batch(batch)
		.then(results => {
			const newObject = results[results.length - 1]
			const batch = []
			if (mobilization && newObject) {
				batch.push(t.none(`
					INSERT INTO mobilization_contributions (pad, mobilization)
					VALUES ($1, $2)
				;`, [newObject.id, mobilization]))
			}
			// UPDATE THE TIMESTAMP
			batch.push(t.none(`
				UPDATE pads SET update_at = NOW() WHERE id = $1
			;`, [id || newObject.id]))
			return t.batch(batch).then(_ => results)
		})
	}).then(results => {
		const newObject = results[results.length - 1]
		if (deletion) {
			const promises = deletion.map(f => {
				if (fs.existsSync(path.join(__dirname, `../public/${f}`))) {
					return new Promise(resolve => {
						resolve(fs.unlinkSync(path.join(__dirname, `../public/${f}`)))
					})
				}
			})
			Promise.all(promises).then(_ => res.json({ status: 200, message: 'Successfully saved.', object: newObject ? newObject.id : null }))
		} else res.json({ status: 200, message: 'Successfully saved.', object: newObject ? newObject.id : null })
	}).catch(err => console.log(err))
}
exports.process.publish = require('./contribute/').publish
// (req, res) => {
// 	const { referer } = req.headers || {}
// 	const { id, limit } = req.query || {}
// 	const { uuid, rights } = req.session || {}
// 	const { lang, activity, object } = req.params || {}
	
// 	let saveSQL
// 	if (id) {
// 		saveSQL = DB.pgp.as.format(`
// 			UPDATE $1:name
// 			SET status = 2,
// 				published = TRUE
// 			WHERE id = $2
// 				AND status = 1
// 				AND (contributor = (SELECT id FROM contributors WHERE uuid = $3)
// 					OR $4 > 2)
// 		;`, [object, +id, uuid, rights])
// 	} else { // PUBLISH ALL
// 		// MAKE SURE WE ARE NOT PUBLISHING MORE THAN THE LIMIT (IF THERE IS A LIMIT)
// 		saveSQL = DB.pgp.as.format(`
// 			UPDATE $1:name
// 			SET status = 2,
// 				published = TRUE
// 			WHERE id IN (
// 				SELECT id FROM $1:name 
// 				WHERE status = 1 
// 					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
// 					OR $3 > 2)
// 				LIMIT $4
// 			)
// 		;`, [object, uuid, rights, limit])
// 	}
// 	// EXECUTE SQL
// 	DB.conn.none(saveSQL)
// 	.then(_ => res.redirect(referer))
// 	.catch(err => console.log(err))
// }
exports.process.delete = require('./contribute/').delete
// (req, res) => {	
// 	const { referer } = req.headers || {}
// 	let { id } = req.query || {}
// 	const { uuid, rights } = req.session || {}
// 	const { object } = req.params || {}
// 	// CONVERT id TO ARRAY
// 	if (!Array.isArray(id)) id = [id]
// 	id = id.map(d => +d)
	
// 	if (!id.length) res.redirect(referer)
// 	else {
// 		if (object === 'pads') {
// 			DB.conn.none(`
// 				DELETE FROM pads
// 				WHERE id IN ($1:csv)
// 					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
// 						OR $3 > 2)
// 			;`, [id, uuid, rights])
// 			.then(_ => res.redirect(referer))
// 			.catch(err => console.log(err))
// 		}
// 		else if (object === 'templates') {
// 			DB.conn.none(`
// 				DELETE FROM templates
// 				WHERE id IN ($1:csv)
// 					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
// 						OR $3 > 2)
// 			;`, [id, uuid, rights])
// 			.then(_ => res.redirect(referer))
// 			.catch(err => console.log(err))
// 		}
// 	}
// }
exports.process.download = (req, res) => { // TO DO: FINISH THIS
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { id } = req.body || {}

	// if (source === 'bookmarks') { // DOWNLOAD MULTIPLE PADS
	// 	saveSQL = DB.pgp.as.format(`
	// 		SELECT p.id, p.title, p.sections, c.name AS contributor, p.date, p.full_text, p.location, p.sdgs, p.tags FROM pads p
	// 		INNER JOIN contributors c
	// 			ON p.contributor = c.id
	// 		WHERE p.id IN (
	// 			SELECT pad FROM engagement_pads 
	// 			WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1) 
	// 				AND type = 'bookmark'
	// 		)
	// 	;`, [uuid])
	// } else { // DOWNLOAD SINGLE PAD
	// 	saveSQL = DB.pgp.as.format(`
	// 		SELECT p.id, p.title, p.sections, c.name AS contributor, p.date, p.full_text, p.location, p.sdgs, p.tags FROM pads p
	// 		INNER JOIN contributors c
	// 			ON p.contributor = c.id
	// 		WHERE p.id = $1
	// 	;`, [source])
	// }
	if (object === 'mobilization') {
		DB.conn.tx(t => {
			const batch = []
			batch.push(t.one(`
				SELECT t.sections FROM mobilizations m
				INNER JOIN templates t
					ON m.template = t.id
				WHERE m.id = $1
			;`, [id]))
			// TO DO: KEEP ONLY PUBLISHED PADS
			batch.push(t.any(`
				SELECT p.id, p.title, p.sections, c.country, to_char(p.date, 'DD Mon YYYY') AS date, to_char(p.update_at, 'DD Mon YYYY') AS update FROM mobilization_contributions mc
				INNER JOIN pads p
					ON mc.pad = p.id
				INNER JOIN contributors c
					ON p.contributor = c.id
				WHERE mc.mobilization = $1
			;`, [id]))
			return t.batch(batch)
		}).then(async results => {
			const [ template, pads ] = results
			
			// function getImg (d) {
			// 	if (d && d.sections) {
			// 		const img = d.sections.map(d => d.items).flat().filter(c => c.type === 'img' && c.src)
			// 		const mosaic = d.sections.map(d => d.items).flat().filter(c => c.type === 'mosaic' && c.srcs)
			// 		const embed = d.sections.map(d => d.items).flat().filter(c => c.type === 'embed' && c.src)
			// 		if (img.length) return img.map(c => c.src)
			// 		else if (mosaic.length) return mosaic.map(c => c.srcs).flat()
			// 		else if (embed.length) return embed.map(c => c.src)
			// 		else return [null]
			// 	} else return [null]
			// }

			function getImg (d) {
				if (d && d.sections) {
					const media = d.sections.map(c => c.items.map(b => b.type === 'group' ? b.items.flat() : b).flat()).flat()
					const img = media.find(c => c.type === 'img' && c.src)
					const mosaic = media.find(c => c.type === 'mosaic' && c.srcs)
					const embed = media.find(c => c.type === 'embed' && c.src)
					if (img && img.length) return img.map(c => c.src)
					else if (mosaic && mosaic.length) return mosaic.map(c => c.srcs).flat()
					else if (embed && embed.length) return embed.map(c => c.src)
					else return [null]
				} else return [null]
			}

			const imgs = pads.map(d => getImg(d)).flat().filter(d => d !== null)
			console.log(imgs)

			const [ structure, entries ] = compileTable(template, pads)			
			const csv = dumpCSV(structure, entries)

			await fs.writeFileSync(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`), csv, 'utf8')		
			// CODE FROM https://github.com/archiverjs/node-archiver
			const zippath = path.join(__dirname, `../tmp/mobilization_${id}.zip`)
			const output = fs.createWriteStream(zippath)
			const archive = archiver('zip', {
				zlib: { level: 9 } // Sets the compression level. 6 is default, 9 is high compression
			})
			output.on('close', function() {
				res.download(path.join(__dirname, `../tmp/mobilization_${id}.zip`), `mobilization_${id}.zip`, err => {
					if (err) console.log(err)
					fs.unlinkSync(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`))
					fs.unlinkSync(path.join(__dirname, `../tmp/mobilization_${id}.zip`))
				})
			})
			archive.on('warning', function(err) {
				if (err.code === 'ENOENT') {
					console.log('archive warning')
					console.log(err)
				} else {
					console.log('archive error')
					console.log(err)
				}
			})
			archive.on('error', err => console.log(err))
			
			archive.pipe(output)
			archive.file(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`), { name: `mobilization_${id}_data.csv` })
			
			imgs.forEach((d, i) => {
				console.log(d)
				// const file = path.join(__dirname, `../public/${d}`)
				// archive.file(file, { name: d })
			})
			archive.finalize()
		}).catch(err => console.log(err))
	}

	// DB.conn.any(saveSQL).then(async results => {
	// 	if (format === 'raw') {
	// 		function getImg (d) {
	// 			if (d && d.sections) {
	// 				const img = d.sections.map(d => d.items).flat().filter(c => c.type === 'img' && c.src)
	// 				const mosaic = d.sections.map(d => d.items).flat().filter(c => c.type === 'mosaic' && c.srcs)
	// 				const embed = d.sections.map(d => d.items).flat().filter(c => c.type === 'embed' && c.src)
	// 				if (img.length) return img.map(c => c.src)
	// 				else if (mosaic.length) return mosaic.map(c => c.srcs).flat()
	// 				else if (embed.length) return embed.map(c => c.src)
	// 				else return [null]
	// 			} else return [null]
	// 		}

	// 		results.forEach(d => d.imgs = getImg(d).flat())
	// 		const imgs = results.map(d => d.imgs).flat()
	// 		const max_imgs = results.sort((a, b) => b.imgs.length - a.imgs.length)[0].imgs.length

	// 		const columns = [
	// 			'id', 
	// 			'title', 
	// 			'contributor', 
	// 			'contribution_date', 
	// 			'full_text', 
	// 			'location_JSON', 
	// 			new Array(5).fill(null).map((d, i) => `SDG_tag_${i + 1}`),
	// 			new Array(5).fill(null).map((d, i) => `thematic_area_tag_${i + 1}`),
	// 			new Array(max_imgs).fill(null).map((d, i) => `image_${i + 1}`)
	// 		].flat()

	// 		let csv = `${columns.join('\t')}`
	// 		results.forEach(d => {
	// 			const imgIdx = getImg(d).map(c => `file: img-${imgs.flat().indexOf(c) + 1}`)

	// 			csv += `\n${[
	// 				d.id, 
	// 				d.title, 
	// 				d.contributor, 
	// 				d.date, 
	// 				`"${d.full_text.replace(/"/g, '""')}"`, 
	// 				JSON.stringify(d.location.centerpoints || d.location.centerpoint), 
	// 				new Array(5).fill(null).map((c, i) => d.sdgs[i] ? d.sdgs[i].toString() : ''), 
	// 				new Array(5).fill(null).map((c, i) => d.tags[i] ? d.tags[i].toString() : ''),
	// 				new Array(max_imgs).fill(null).map((c, i) => imgIdx[i] ? imgIdx[i].toString() : '')
	// 			].flat().join('\t')}`
	// 		})

	// 		await fs.writeFileSync(path.join(__dirname, '../tmp/solutions_data.tsv'), csv, 'utf8')		
	// 		// CODE FROM https://github.com/archiverjs/node-archiver
	// 		const zippath = path.join(__dirname, '../tmp/grassroots_solutions.zip')
	// 		const output = fs.createWriteStream(zippath)
	// 		const archive = archiver('zip', {
	// 			zlib: { level: 9 } // Sets the compression level. 6 is default, 9 is high compression
	// 		})
	// 		output.on('close', function() {
	// 			res.download(path.join(__dirname, '../tmp/grassroots_solutions.zip'), 'grassroots_solutions.zip', err => {
	// 				if (err) console.log(err)
	// 				fs.unlinkSync(path.join(__dirname, '../tmp/solutions_data.tsv'))
	// 				fs.unlinkSync(path.join(__dirname, '../tmp/grassroots_solutions.zip'))
	// 			})
	// 		})
	// 		archive.on('warning', function(err) {
	// 			if (err.code === 'ENOENT') {
	// 				console.log('archive warning')
	// 				console.log(err)
	// 			} else {
	// 				console.log('archive error')
	// 				console.log(err)
	// 			}
	// 		})
	// 		archive.on('error', err => console.log(err))
			
	// 		archive.pipe(output)
	// 		archive.file(path.join(__dirname, '../tmp/solutions_data.tsv'), { name: 'solutions_data.tsv' })
			
	// 		imgs.forEach((d, i) => {
	// 			const file = path.join(__dirname, `../public/${d}`)
	// 			archive.file(file, { name: `img-${i + 1}${path.extname(file)}` })
	// 		})
	// 		archive.finalize()
	// 	}
	// })
}
function extractItem (d = {}, section = null, group = null) {
	if (d.type === 'img') return { key: d.instruction, value: d.src ? d.src : null, section: section, group: group }
	if (d.type === 'mosaic') return { key: d.instruction, value: d.srcs.length ? d.srcs.join(', ') : null, section: section, group: group }
	// NOTE: HAVE NOT TESTED WITH mosaic OR video
	if (d.type === 'video') return { key: d.instruction, value: d.src ? d.src : null, section: section, group: group }
	if (d.type === 'txt') return { key: d.instruction, value: d.txt && d.txt !== '' ? d.txt : null, section: section, group: group }
	if (d.type === 'embed') return { key: d.instruction, value: d.html && d.html !== '' ? d.html : null, section: section, group: group }
	if (d.type === 'checklist') return d.options.map(c => { return { key: `${d.instruction}: ${c.name}`, value: c.checked ? 1 : 0, section: section, group: group } })
	if (d.type === 'radiolist') return { key: d.instruction, value: d.options && d.options.find(c => c.checked) ? d.options.find(c => c.checked).name : null, section: section, group: group }
	
	if (d.type === 'sdgs') return { key: d.instruction, value: d.sdgs.length ? d.sdgs.join(', ') : null, section: section, group: group }
	if (d.type === 'tags') return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }
	if (d.type === 'skills') return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }
	if (d.type === 'datasources') return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }

	if (d.type === 'group') { 
		if (d.repeat) { // THIS IS A REPEAT GROUP
			const grouped_items = []
			for (let i = 0; i < d.repeat; i ++) {
				let items = []
				if (d.items[i]) items = d.items[i]
				// PASS AN OBJECT WITH ALL null VALUES (THIS IS A FILLER IN CASE OTHER PADS HAVE MORE REPETITIONS OF THE GROUP)
				else {
					items = d.items[0].map(c => { // THIS IS MAYBE A BIT HACKY (SINCE VERY SPECIFIC)
						const obj = {}
						for (key in c) {
							obj[key] = c[key]
							if (!['type', 'instruction'].includes(key)) {
								if (obj.type === 'checklist' && key === 'options') obj[key].forEach(b => b.checked = false) // IF CHECKLIST, THEN WE NEED TO KEEP THE OPTIONS AND WE FORCE A NON RESPONSE (checked = false)
								else obj[key] = null
							}
						}
						return obj
					})
				}				
				grouped_items.push(items.map(c => { // THESE ARE THE ITEMS IN EACH REPEAT GROUP
					return extractItem(c, section, `${d.instruction} #${i + 1}`)
				}).flat())
			}
			return grouped_items.flat()
		} else { // THIS IS NOT A REPEAT GROUP
			return d.items.map(c => { // THIS IS WHERE REPEAT GROUPS ARE STORED
				return c.map(b => { // THESE ARE THE ITEMS IN EACH GROUP
					return extractItem(b, section, `${d.instruction}`)
				}).flat()
			}).flat()
		}
	}
}
function compileEntries (sections = [], id = null, title = null, country = null, submitted = null, updated = null) {
	sections = sections.map((c, j) => c.items.map(b => extractItem(b, `${j}: ${c.title}`))).flat().flat()
	// FINALLY, ADD COLUMNS FOR title, contributor, submitted, AND updated
	sections.unshift({ section: null, group: null, key: 'updated', value: updated })
	sections.unshift({ section: null, group: null, key: 'submitted', value: submitted })
	sections.unshift({ section: null, group: null, key: 'contributor', value: `AccLab ${country}` })
	sections.unshift({ section: null, group: null, key: 'title', value: title })
	sections.unshift({ section: null, group: null, key: 'id', value: id })

	return { 
		id: id,
		title: title, 
		contributor: `AccLab ${country}`,
		submitted: submitted,
		updated: updated,
		sections: sections,
		// count_sections: d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)).length
	}
}
function compileTable (template = {}, pads = []) { // TO DO: ISSUE IS HERE
	const repeat_sections = template.sections.filter(d => d.repeat).map(d => d.group)
	const repeat_sections_counts = repeat_sections.map(d => { return { group: d, count: pads.map(c => c.sections.filter(b => b.group === d).length).max() } })
	const entries = []
	// RULE: IF THERE IS ONLY ONE REPEAT SECTION, THEN BREAK UP INTO MULLTIPLE ENTRIES
	// OTHERWISE KEEP AS SINGLE ENTRY WITH MORE COLUMNS
	if (repeat_sections.length === 0) {
		pads.forEach(d => {
			entries.push(compileEntries(d.sections, d.id, d.title, d.country, d.date, d.update))
		})
	} else if (repeat_sections.length === 1) {
		// HERE WE EXPLODE EACH PAD INTO MUTIPLE ENTRIES
		offset_index = template.sections.findIndex(d => d.group === repeat_sections_counts[0].group)
		pads.forEach(d => {
			const repetitions = d.sections.filter(c => c.repeat).length
			for (let i = 0; i < repetitions; i ++) {
				entries.push(compileEntries(d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)), d.id, d.title, d.country, d.date, d.update))
			}
		})
	} // else TO DO: IF THERE ARE MULTIPLE REPEAT SECTIONS, THEN WE DO NOT TREAT EACH AS A NEW ENTRY, BUT RATHER AS ADDITIONAL DIMENSIONS 
		// pads.forEach(d => {
		// 	for (let i = 0; i < repeat_sections_counts[0].count; i ++) {
		// 		entries.push(compileEntries(d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)), d.id, d.title, d.country, d.date, d.update))
		// 	}
		// })
	// }
	// HERE WE CREATE A REFERENCE FOR THE STRUCTURE OF THE TABLE
	// AND WE CHECK WHETHER THE TEMPLATE CONTAINS GROUPS: IF IT DOES NOT, WE DO NOT NEED TO CREATE AN EXTRA GROUP LEVEL
	const groups = template.sections.map(d => d.structure.filter(c => c.type === 'group')).flat()
	const structure = entries[0].sections.map(d => {
		const obj = {}
		obj.section = d.section
		if (groups.length) obj.group = d.group
		obj.key = d.key
		return obj
	})
	return [structure, entries]
}
function dumpCSV (structure, entries) {
	let csv = structure.map(d => {
		if (typeof d.key === 'string') {
			if (d.key.includes(',')) return `"${stripHTML(d.key.replace(/\"/g, '""'))}"`
			else if (d.key.match(/\n/)) return `"${stripHTML(d.key.replace(/\"/g, '""'))}"`
			else return d.key
		} else return d.key
	}).join(',')
	entries.forEach(d => {
		csv += `\n${d.sections.map(c => {
			if (typeof c.value === 'string') {
				if (c.value.includes(',')) return `"${stripHTML(c.value.replace(/\"/g, '""'))}"` 
				else if (c.value.match(/\n/)) return `"${stripHTML(c.value.replace(/\"/g, '""'))}"`
				else return c.value
			} else return c.value
		}).join(',')}`
	})
	return csv
}
// EXAMPLE FOUND AT: https://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/
function stripHTML (str) {
	return str.replace(/(<([^>]+)>)/gi, '')
}

exports.process.engage = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message } = req.body || {}

	let saveSQL
	if (active) { // INSERT
		saveSQL = DB.pgp.as.format(`
			INSERT INTO engagement_pads (contributor, pad, type, message) 
			SELECT id, $1, $2, $3 FROM contributors WHERE uuid = $4
			RETURNING TRUE
		;`, [+pad, type, message, uuid])
	} else { // DELETE
		saveSQL = DB.pgp.as.format(`
			DELETE FROM engagement_pads
			WHERE pad = $1
				AND type = $2
				AND contributor = (SELECT id FROM contributors WHERE uuid = $3)
			RETURNING FALSE
		;`, [+pad, type, uuid])
	}

	DB.conn.one(t => saveSQL)
	.then(result => {
		res.json(result)
	}).catch(err => console.log(err))
}
exports.process.validate = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message, path } = req.body || {}

	DB.conn.none(`
		INSERT INTO engagement_pads (contributor, pad, type, message) 
		SELECT id, $1, $2, $3 FROM contributors WHERE uuid = $4
	;`, [+pad, type, message, uuid])
	.then(result => {
		res.redirect(path)
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ============================= API ============================= */
/* =============================================================== */
if (!exports.api) exports.api = {}
exports.api.skills = (req, res) => {
	DB.conn.any(`
		SELECT id, category, name FROM skills ORDER BY category, name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.methods = (req, res) => {
	DB.conn.any(`
		SELECT id, name FROM methods ORDER BY name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.datasources = (req, res) => {
	DB.conn.any(`
		SELECT d.id, d.name, d.description, c.country FROM datasources d
		LEFT JOIN contributors c
			ON d.contributor = c.id
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}


// THIS WILL BE DEPRECATED
// exports.unpublish = (req, res) => {
// 	const ids = req.body.ids
// 	const type = req.body.type

// 	DB.conn.none(`
// 		UPDATE $1:raw
// 		SET status = 1,
// 			published = FALSE
// 		WHERE id IN ($2:csv)
// 	;`, [type, ids])
// 	.then(_ => res.json({ status: 200, message: `all ${type} were unpublished` }))
// 	.catch(err => console.log(err))
// }


exports.notfound = (req, res) => {
	res.send('This is not the route that you are looking for')
}


Array.prototype.max = function (key, onkey) {
	const max = this.sort((a, b) => {
		if (key) return b[key] - a[key]
		else return b - a
	})[0]
	if (onkey) return max[key]
	else return max
}
Array.prototype.min = function (key, onkey) {
	const min = this.sort((a, b) => {
		if (key) return a[key] - b[key]
		else return a - b
	})[0]
	if (onkey) return min[key]
	else return min
}
Array.prototype.chunk = function(size) {
	const groups = []
	for (let i = 0; i < this.length; i += size) {
		groups.push(this.slice(i, i + size))
	}
	return groups
}
Array.prototype.unique = function (key, onkey) {
	const arr = []
	this.forEach(d => {
		if (!key) {
			if (arr.indexOf(d) === -1) arr.push(d)
		}
		else {
			if (onkey) { if (arr.map(c => c).indexOf(d[key]) === -1) arr.push(d[key]) }
			else { if (arr.map(c => c[key]).indexOf(d[key]) === -1) arr.push(d) }
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
				else obj[keep] = d[k]
				arr.push(obj)
			} else arr.push({ key: groupby, values: [d], count: 1 })
		} else { 
			arr.find(c => c.key === groupby).values.push(d)
			arr.find(c => c.key === groupby).count ++
		}
	})
	return arr
}
Array.prototype.intersection = function (V2) {
	const intersection = []
	this.sort()
	V2.sort()
	for (let i = 0; i < this.length; i += 1) {
		if(V2.indexOf(this[i]) !== -1){
			intersection.push(this[i])
		}
	}
	return intersection
}
Array.prototype.sum = function (key) {
	if (this.length === 0) return 0
	if (!key) return this.reduce((accumulator, value) => +accumulator + +value)
	else {
		return this.reduce((accumulator, value) => {
			const obj = {}
			obj[key] = +accumulator[key] + +value[key]
			return obj
		})[key]
	}
}
String.prototype.simplify = function () {
	return this.valueOf().replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase()
}
String.prototype.capitalize = function () {
	return this.valueOf().charAt(0).toUpperCase() + this.valueOf().slice(1)
}
String.prototype.removeAccents = function () {
	// CREDIT TO https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
	return this.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
String.prototype.replacePunctuation = function (replacement) {
	return this.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, replacement).replace(/\s{2,}/g, ' ') // THIS KEEPS COMMAS
}
Date.prototype.displayDMY = function () {
	const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const Ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	const d = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
	const h = this.getHours() < 10 ? `0${this.getHours()}` : this.getHours()
	const m = this.getMinutes() < 10 ? `0${this.getMinutes()}` : this.getMinutes()
	return `${this.getDate()} ${Ms[this.getMonth()]}, ${this.getFullYear()}`
}


// Promise.all(geocode(['Livno, Bosnia and Herzegovina', 'Sarajevo, Bosnia and Herzegovina'], 'centerpoint'))
// .then(data => console.log(data))
// .catch(err => console.log(err))