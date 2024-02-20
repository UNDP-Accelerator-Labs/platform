const { DB } = include('config/')
const { checklanguage, redirectError } = include('routes/helpers/')

module.exports = (req, res) => {
	const { id, cohort } = req.body || {}
	const { uuid } = req.session || {}
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)

	if (id) { // UPDATE OBJECT

		DB.conn.tx(t => {
			const values = Object.keys(req.body)
				.filter(key => !['id', 'cohort'].includes(key))
				.reduce((obj, key) => {
					obj[key] = req.body[key]
					return obj
				}, {})

			const update = `${DB.pgp.helpers.update(values, null, 'mobilizations')} ${DB.pgp.as.format('WHERE id = $1::INT', [ id ])}`;

			return t.one(update)
			.then(result => {
				if (cohort) {
					return t.any(`
						SELECT participant FROM mobilization_contributors
						WHERE participant IN ($1:csv)
						AND mobilization = $2::INT
					;`, [ cohort, id ])
					.then(oldcohort => {
						oldcohort = oldcohort.map(d => d.participant)
						const newcohort = cohort.filter(d => !oldcohort.includes(d))
						.map(d => {
							return { 'participant': d, 'mobilization': id }
						})
						const updatecohort = `${DB.pgp.helpers.update(newcohort, ['?mobilization', 'participant'], 'mobilization_contributors')} WHERE t.mobilization = v.mobilization`
						return t.none(updatecohort)
						.catch(err => console.log(err))
					}).catch(err => console.log(err))
				} else return false
			}).catch(err => console.log(err))
		}).then(_ => {
			res.redirect(`/${language}/browse/mobilizations/ongoing`)
		}).catch(err => {
			console.error(err)
			redirectError(req, res)
		})
	} else redirectError(req, res)
}
