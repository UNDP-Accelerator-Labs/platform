const { app_title, DB } = include('config/')
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
	
	const promises = geocode(locations, country.lnglat, list)
	Promise.all(promises)
	.then(data => res.json(data))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
	})
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
exports.render.login = require('./login/').render
exports.process.login = require('./login/').process
exports.process.logout = require('./login/').logout
exports.redirect.home = require('./login/').redirect

exports.redirect.public = (req, res) => res.redirect('/public')
exports.dispatch.public = require('./login/').public


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

	if (object === 'mobilization') {
		compileMobilization(req, res)
	}
}
function compileMobilization (req, res) {
	const { id } =  req.query || {}

	Promise.all(DB.conns.map(conn => {
		conn.tx(t => {
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
	})).then(_ => console.log('returned all promises'))
	.catch(err => console.log(err))
}
/* =============================================================== */
/* ============================ PADS ============================= */
/* =============================================================== */
exports.dispatch.contribute = require('./contribute/').main // THIS SHOULD NOT BE NEEDED
exports.dispatch.edit = require('./edit/').main
exports.dispatch.view = require('./view/').main



/* =============================================================== */
/* ====================== SAVING MECHANISMS ====================== */
/* =============================================================== */
exports.process.check = require('./check/').main
exports.process.save = require('./save/').main
exports.process.generate = require('./generate/').main
exports.process.delete = require('./delete/').main

exports.process.publish = require('./publish/').publish
exports.process.unpublish = require('./publish/').unpublish

exports.process.share = require('./share/').share

exports.process.forward = require('./forward/').main

exports.process.pin = require('./engage/').pin
// exports.process.unpin = require('./engage/').unpin

exports.process.engage = require('./engage/').engage
exports.process.comment = require('./engage/').comment

exports.process.request = require('./request/').main
exports.process.accept = require('./accept/').accept
exports.process.decline = require('./accept/').decline



// THIS IS DEPRECATED
exports.process.download = (req, res) => {
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { id } = req.body || {}

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
}

// MIGRATE THE FOLLOWING TO helpers // THIS IS DEPRECATED
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
// THIS IS DEPRECATED
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
exports.dispatch.apis = require('./apis/')

if (!exports.api) exports.api = {}
// THE TAGS APIS SHOULD BE DEPRECATED FOR NOW
exports.api.skills = (req, res) => {
	DB.general.any(`
		SELECT id, category, name FROM skills ORDER BY category, name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.methods = (req, res) => {
	DB.general.any(`
		SELECT id, name FROM methods ORDER BY name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.datasources = (req, res) => {
	if (req.method === 'GET') {
		DB.general.any(`
			SELECT d.id, d.name, d.description, u.iso3 FROM datasources d
			LEFT JOIN users u
				ON u.uuid = d.contributor
		;`).then(results => res.status(200).json(results))
		.catch(err => res.status(500).send(err))
	} else if (req.method === 'POST') {
		const { uuid } = req.session || {}
		const { tag } = req.body || {}

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