const { app_title, DB } = include('config')
const helpers = include('routes/helpers/')
// const request = require('request')
const format = require('./formatting.js')
const path = require('path')
const fs = require('fs')
// const mime = require('mime')
const Jimp = require('jimp')
const { execFile } = require('child_process')
const fetch = require('node-fetch')
const Pageres = require('pageres') // THIS IS FOR SCREENSHOTS
const turf = require('@turf/turf')
const archiver = require('archiver')


if (!exports.redirect) { exports.redirect = {} }
if (!exports.render) { exports.render = {} }
if (!exports.process) { exports.process = {} }
if (!exports.public) { exports.public = {} }
if (!exports.private) { exports.private = {} }
if (!exports.dispatch) { exports.dispatch = {} }



exports.forwardGeocoding = (req, res) => {
	const { locations, list } = req.body || {}
	const { country } = req.session || {}
	// DB.conn.one(`
	// 	SELECT p.lat, p.lng FROM centerpoints cp
	// 	INNER JOIN contributors c
	// 		ON c.country = cp.country
	// 	WHERE c.uuid = $1
	// ;`, [req.session.uuid])
	// .then(centerpoint => {
		const promises = geocode(locations, country.lnglat, list)
		Promise.all(promises)
		.then(data => res.json(data))
		.catch(err => {
			console.log(err)
			res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
		})
	// }).catch(err => console.log(err))
}
function geocode (locations, centerpoint, list = false, dir = 'forward') { // FOR NOW WE ONLY DO FORWARD GEOCODING
	console.log('pay attention to forward geocode')
	return locations.map(l => {
		return new Promise(resolve => {
			if (!l || typeof l !== 'string') {
				const obj = {}
				obj.input = l
				obj.found = false
				obj.centerpoint = centerpoint
				obj.caption = `No location was found for <strong>${l}</strong>.` // TO DO: TRANSLATE
				resolve(obj)
			} else {
				setTimeout(_ => {
					l_formatted = l.removeAccents().replacePunctuation(', ').trim()
					console.log(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}`)
					fetch(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}&key=${process.env.OPENCAGE_API}`)
					.then(response => response.json())
					.then(data => {
						const obj = {}
						obj.input = l
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
							obj.caption = `No location was found for <strong>${l.trim().capitalize()}</strong>.` // TO DO: TRANSLATE
						}
						resolve(obj)
					}).catch(err => console.log(err))
				}, 1000)
			}
		})
	})
}




exports.process.callapi = (req, res) => {
	const { uri, method, key, expect } = req.body || {}
	const headers = { 
		'Accept': 'application/*', 
		'Content-Type': 'application/*', 
		'X-Requested-With': 'XMLHttpRequest',
		'x-access-token': process.env[key]
	}
	
	fetch(uri, { method: method, headers: headers })
		.then(response => {
			if (expect === 'json') return response.json()
			else if (['blob', 'image', 'file'].includes(expect)) return response.blob()
			else return response
		}).then(result => {
			if (expect === 'json') res.json(result)
			else if (['blob', 'image', 'file'].includes(expect)) {
				// BASED ON https://stackoverflow.com/questions/52665103/using-express-how-to-send-blob-object-as-response
				res.type(result.type)
				result.arrayBuffer().then(buf => {
					res.send(Buffer.from(buf))
				})
			}
			else res.send(result)
		}).catch(err => console.log(err))
}

/* =============================================================== */
/* =========================== LOGIN ============================= */
/* =============================================================== */
exports.render.login = require('./login').render
exports.process.login = require('./login').process
exports.process.logout = require('./login').logout
exports.redirect.home = require('./login').redirect

exports.redirect.public = (req, res) => res.redirect('/public')
exports.dispatch.public = require('./login').public


/* =============================================================== */
/* =========================== BROWSE ============================ */
/* =============================================================== */
exports.dispatch.browse = require('./browse/')

/* =============================================================== */
/* ========================= MOBILIZE ============================ */
/* =============================================================== */
// THIS DOES NOT SEEM TO RETURN ANYTHING
exports.dispatch.analyse = (req, res) => {
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	const language = helpers.checklanguage(req.params?.language || req.session.language)

	// if (rights > 0)	{
	// 	if (object === 'pad') createPad(req, res)
	// 	else if (object === 'import') createImport(req, res)
	// 	else if (object === 'template') createTemplate(req, res)
	// } else res.redirect(`/${language}/browse/${object}s/public`)

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
exports.dispatch.contribute = require('./contribute/').main

exports.dispatch.edit = require('./edit/').main

exports.dispatch.view = require('./view/').main

exports.dispatch.import = require('./import/').create

exports.dispatch.mobilize = require('./mobilize/').main

/* =============================================================== */
/* ========================== IMPORT ============================= */
/* =============================================================== */
// TO DO: CHANGE THIS TO THE GENERAL save/ MECHANISM
exports.storeImport = require('./import/').save

/* =============================================================== */
/* ====================== SAVING MECHANISMS ====================== */
/* =============================================================== */
exports.process.upload = (req, res) => {
	const { uuid } = req.session || {}
	
	const fls = req.files
	console.log(fls)
	const promises = fls.map(f => {
		const basedir = path.join(__dirname, `../public/uploads/`)
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		const dir = path.join(basedir, uuid)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
		const source = path.join(__dirname, `../${f.path}`)

		return new Promise(resolve => {
			if (['image/png', 'image/jpg', 'image/jpeg', 'image/jfif', 'image/gif', 'application/octet-stream'].includes(f.mimetype)) { // octet-streram IS FOR IMAGE URLs				
				const smdir = path.join(basedir, 'sm/')
				if (!fs.existsSync(smdir)) fs.mkdirSync(smdir)
				const targetdir = path.join(smdir, uuid)
				if (!fs.existsSync(targetdir)) fs.mkdirSync(targetdir)

				// const source = path.join(__dirname, `../${f.path}`)
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
			} else if (f.mimetype.includes('application/pdf')) {
				const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)

				DB.conn.one(`
					INSERT INTO files (name, path, contributor) 
					SELECT $1, $2, id FROM contributors WHERE uuid = $3
					RETURNING id
				;`, [f.originalname, `/${target.split('public/')[1]}`, uuid])
				.then(result => {
					if (result) {
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					} else resolve({ status: 403, message: 'file was not properly stored' })
				}).catch(err => console.log(err))
			} else {
				fs.unlinkSync(source)
				resolve({ status: 403, ftype: f.mimetype, message: 'wrong file format' })
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
// THIS IS NOT BEING USED NOW
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



exports.process.check = require('./check/').main
exports.process.save = require('./save/').main
exports.process.generate = require('./generate/').main
exports.process.delete = require('./delete/').main

exports.process.publish = require('./publish/').publish
exports.process.unpublish = require('./publish/').unpublish

exports.process.forward = require('./forward/').main

exports.process.pin = require('./engage/').pin
// exports.process.unpin = require('./engage/').unpin

exports.process.engage = require('./engage/').engage
exports.process.comment = require('./engage/').comment

exports.process.request = require('./request/').main
exports.process.accept = require('./accept/').accept
exports.process.decline = require('./accept/').decline



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
	// 			SELECT docid FROM engagement
	// 			WHERE user = $1
	//				AND doctype = $2
	// 				AND type = 'bookmark'
	// 		)
	// 	;`, [ uuid, 'pad' ])
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
				if (d?.sections) {
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

// TO DO: MIGRATE THE FOLLOWING TO helpers
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
	if (['skills', 'methods'].includes(d.type)) return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }
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
	sections = sections.map((c, j) => c.items.map(b => extractItem(b, `${j}: ${c.title}`))).flat(2)
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
	const repeat_sections_counts = repeat_sections.map(d => { return { group: d, count: Math.max(...pads.map(c => c.sections.filter(b => b.group === d).length)) } })
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
			if (d.key.includes(',')) return `"${helpers.stripHTML.call(d.key.replace(/\"/g, '""'))}"`
			else if (d.key.match(/\n/)) return `"${helpers.stripHTML.call(d.key.replace(/\"/g, '""'))}"`
			else return d.key
		} else return d.key
	}).join(',')
	entries.forEach(d => {
		csv += `\n${d.sections.map(c => {
			if (typeof c.value === 'string') {
				if (c.value.includes(',')) return `"${helpers.stripHTML.call(c.value.replace(/\"/g, '""'))}"` 
				else if (c.value.match(/\n/)) return `"${helpers.stripHTML.call(c.value.replace(/\"/g, '""'))}"`
				else return c.value
			} else return c.value
		}).join(',')}`
	})
	return csv
}


// TO DO: CHECK WHETHER THIS IS NECESSARY: engage SHOULD COVER FOR THIS
exports.process.validate = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message, path } = req.body || {}

	DB.conn.none(`
		INSERT INTO engagement (contributor, doctype, docid, type, message) 
		VALUES ($1, $2, $3, $4, $5)
	;`, [ uuid, 'pad', +pad, type, message])
	.then(result => {
		res.redirect(path)
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ============================= API ============================= */
/* =============================================================== */
if (!exports.api) exports.api = {}
exports.api.skills = (req, res) => {
	// DB.conn.any(`
	// 	SELECT id, category, name FROM skills ORDER BY category, name
	// ;`).then(results => res.status(200).json(results))
	// .catch(err => res.status(500).send(err))
	DB.general.any(`
		SELECT id, category, name FROM skills ORDER BY category, name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.methods = (req, res) => {
	// DB.conn.any(`
	// 	SELECT id, name FROM methods ORDER BY name
	// ;`).then(results => res.status(200).json(results))
	// .catch(err => res.status(500).send(err))
	DB.general.any(`
		SELECT id, name FROM methods ORDER BY name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.datasources = (req, res) => {
	if (req.method === 'GET') {
		// DB.conn.any(`
		// 	SELECT d.id, d.name, d.description, c.country FROM datasources d
		// 	LEFT JOIN contributors c
		// 		ON d.contributor = c.id
		// ;`).then(results => res.status(200).json(results))
		// .catch(err => res.status(500).send(err))
		DB.general.any(`
			SELECT d.id, d.name, d.description, u.iso3 FROM datasources d
			LEFT JOIN users u
				ON u.uuid = d.contributor
		;`).then(results => res.status(200).json(results))
		.catch(err => res.status(500).send(err))
	} else if (req.method === 'POST') {
		const { uuid } = req.session || {}
		const { tag } = req.body || {}

		// DB.conn.one(`
		// 	INSERT INTO datasources (name, contributor)
		// 	SELECT $1, id FROM contributors
		// 	WHERE uuid = $2
		// 		ON CONFLICT ON CONSTRAINT datasources_name_key
		// 		DO NOTHING
		// 	RETURNING id, name
		// ;`, [tag.toLowerCase(), uuid || null])
		// .then(result => res.status(200).json(result))
		// .catch(err => res.status(500).send(err))
		DB.general.one(`
			INSERT INTO datasources (name, contributor)
			VALUES ($1, $2)
				ON CONFLICT ON CONSTRAINT datasources_name_key
				DO NOTHING
			RETURNING uuid, name
		;`, [ tag.toLowerCase(), uuid || null ])
		.then(result => res.status(200).json(result))
		.catch(err => res.status(500).send(err))
	}
}



exports.notfound = (req, res) => {
	res.send('This is not the route that you are looking for')
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