const DB = require('../../db-config.js')

exports.main = (req, res) => {
	// CHECK THE PAD EXISTS
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { id, tagging, deletion, mobilization } = req.body || {}
	let saveSQL

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'deletion', 'mobilization', 'tagging'].includes(key))
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
		saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'deletion', 'mobilization', 'tagging'].includes(d)), `${object}s`) + condition
	}	

	DB.conn.tx(t => { 
		const batch = []
		// if (datasources) {
		// 	JSON.parse(datasources).forEach(d => {
		// 		batch.push(t.none(`
		// 			INSERT INTO datasources (name, contributor)
		// 			SELECT $1, id FROM contributors
		// 			WHERE uuid = $2
		// 				ON CONFLICT ON CONSTRAINT datasources_name_key
		// 				DO NOTHING
		// 		;`, [d.toLowerCase(), uuid]))
		// 	})
		// }
		return t.oneOrNone(saveSQL)
		.then(result => {
			const newID = result ? result.id : undefined
			const batch = []
			
			// SAVE TAGS INFO
			if (tagging && tagging.length) {
				tagging.forEach(d => {
					batch.push(t.none(`
						INSERT INTO tagging (pad, tag_id, tag_name, type)
						VALUES ($1, $2, $3, $4)
						ON CONFLICT ON CONSTRAINT unique_pad_tag_type
							DO NOTHING
					;`, [newID || id, d.tag_id, d.tag_name, d.type]))
				})
			}
			// SAVE MOBILIZATION INFO
			if (mobilization && newID) {
				batch.push(t.none(`
					INSERT INTO mobilization_contributions (pad, mobilization)
					VALUES ($1, $2)
				;`, [newID, mobilization]))
			}
			// UPDATE THE TIMESTAMP
			batch.push(t.none(`
				UPDATE pads SET update_at = NOW() WHERE id = $1
			;`, [newID || id]))
			return t.batch(batch).then(_ => newID)
		})
	}).then(newID => {
		// const newObject = results[results.length - 1]
		if (deletion) {
			const promises = deletion.map(f => {
				if (fs.existsSync(path.join(__dirname, `../public/${f}`))) {
					return new Promise(resolve => {
						resolve(fs.unlinkSync(path.join(__dirname, `../public/${f}`)))
					})
				}
			})
			Promise.all(promises).then(_ => res.json({ status: 200, message: 'Successfully saved.', object: newID }))
		} else res.json({ status: 200, message: 'Successfully saved.', object: newID })
	}).catch(err => console.log(err))
}