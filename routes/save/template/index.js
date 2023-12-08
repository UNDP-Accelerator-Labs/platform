const { DB } = include('config/')
const { limitLength } = include('routes/helpers/')

module.exports = (req, res) => {
	const { id, review_template, review_language, source, completion } = req.body || {}
	if (req.body?.sections) req.body.sections = JSON.stringify(req.body.sections)
	if (req.body?.title) req.body.title = limitLength(req.body.title, 99)

	const { uuid } = req.session || {}

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'completion', 'review_template', 'review_language'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})

		var saveSQL = DB.pgp.as.format(`
			INSERT INTO templates ($1:name, owner)
			VALUES ($1:csv, $2)
			RETURNING id
		;`, [ insert, uuid ])
	} else { // UPDATE OBJECT
		const condition = DB.pgp.as.format(` WHERE id = $1::INT;`, [ id ])
		saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'completion', 'review_template', 'review_language'].includes(d)), 'templates') + condition
	}

	DB.conn.tx(t => {
		return t.oneOrNone(saveSQL)
		.then(result => {
			const newID = result ? result.id : undefined
			const batch = []

			if (review_template && !id) { // THIS IS A NEW REVIEW TEMPLATE
				batch.push(t.none(`
					INSERT INTO review_templates (template, language)
					VALUES ($1, $2)
					ON CONFLICT ON CONSTRAINT review_templates_language_key
						DO UPDATE
						SET template = EXCLUDED.template
				;`, [ newID || id, review_language ]))
			}
			// SAVE VERSION TREE
			if (newID) {
				if (source) {
					batch.push(t.none(`
						UPDATE templates
						SET version = source.version || $1::TEXT
						FROM (SELECT id, version FROM templates) AS source
						WHERE templates.id = $1::INT
							AND source.id = templates.source
					;`, [ newID ]))
				} else {
					batch.push(t.none(`
						UPDATE templates
						SET version = '$1'::ltree
						WHERE id = $1::INT
					;`, [ newID ]))
				}
			}
			// UPDATE THE TIMESTAMP
			batch.push(t.none(`
				UPDATE templates SET update_at = NOW() WHERE id = $1::INT
			;`, [ newID || id]))

			// UPDATE STATUS
			batch.push(t.one(`
				SELECT status FROM templates
				WHERE id = $1::INT
			;`, [ newID || id ], d => d.status)
			.then(status => {
				if (completion) status = Math.max(1, status)
				else status = 0

				return t.none(`
					UPDATE templates SET status = $1::INT
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
			// .then(_ => newID)
			// .catch(err => console.log(err))
		})
	}).then(data => res.json({ status: 200, message: 'Successfully saved.', data }))
	.catch(err => console.log(err))
}
