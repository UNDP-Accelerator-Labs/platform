const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}
	const { id } = req.query || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, templates, participations } = await header_data({ connection: t, req: req })

		const batch = []
		// THE MOBILIZATION INFORMATION
		batch.push(t.one(`
			SELECT m.title, m.status, m.start_date, m.end_date, m.host, c.name AS hostname, t.title AS template FROM mobilizations m
			INNER JOIN contributors c
				ON c.id = m.host
			INNER JOIN templates t
				ON t.id = m.template
			WHERE m.id = $1
		;`, [id]))
		// AN OVERVIEW OF WHO HAS CONTRIBUTED
		batch.push(t.any(`
			SELECT co.target AS id, c.name, c.country, c.position FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
			ORDER BY c.country
		;`, [uuid]))

		// AN OVERVIEW/ FILTER OF THE DIFFERENT CHECK AND RADIO LISTS
		batch.push(t.any(`
			SELECT p.id, p.sections, c.country FROM pads p
			INNER JOIN mobilization_contributions mc
				ON p.id = mc.pad
			INNER JOIN contributors c
				ON p.contributor = c.id
			WHERE p.status = 2
				AND mc.mobilization = $1
		;`, [id]))

		// AN OVERVIEW OF METHODS

		// AND OVERVIEW OF DATA

		// AN OVERVIEW OF THEMES

		// AN OVERVIEW OF SDGS


		
		return t.batch(batch)
		.then(results => {
			const [mobilization, cohort, pads] = results

			let data = pads.map(d => {
				const entries = compileEntries(d.sections)
				entries.forEach(c => c.id = d.id)
				return entries
			}).filter(d => d.length).flat()
			.nest('instruction')

			return { 
				metadata : {
					page: {
						title: pagetitle, 
						path: path,
						referrer: originalUrl,
						// id: page,
						lang: lang,
						activity: path[1],
						object: object,
						// space: space,
						query: query
					},
					menu: {
						templates: templates,
						participations: participations
					},
					user: {
						name: username,
						country: country,
						// centerpoint: centerpoint,
						rights: rights
					}
				},

				mobilization: mobilization || {},
				data: data || {}
			}
		})
	}).then(data => res.status(200).render('mobilization', data))
	.catch(err => console.log(err))
}

function extractItem (d = {}) {	
	if (['checklist', 'radiolist'].includes(d.type)) return d

	if (d.type === 'group') {
		return d.items.map(c => { // THIS IS WHERE REPEAT GROUPS ARE STORED
			return c.map(b => { // THESE ARE THE ITEMS IN EACH GROUP
				return extractItem(b)
			}).flat().filter(b => b)
		}).flat().filter(c => c)
	}
}
function compileEntries (sections = []) {
	return sections.map(d => d.items.map(c => extractItem(c))).flat().filter(d => d).flat().filter(d => d)
}