const { app_title, DB, ownDB, modules, engagementtypes, metafields } = include('config/')
const { checklanguage, datastructures, parsers, safeArr, DEFAULT_UUID, pagestats, shortStringAsNum } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { uuid, rights, country, collaborators, public } = req.session || {}
	let { read, write } = modules.find(d => d.type === 'pads')?.rights || {}

	let { space, object, instance } = req.params || {}
	if (!space) space = Object.keys(req.query)?.length ? req.query.space : Object.keys(req.body)?.length ? req.body.space : {} // req.body?.space // THIS IS IN CASE OF POST REQUESTS (e.g. COMMING FROM APIS/ DOWNLOAD)

	let { search, status, contributors, countries, regions, teams, pads, templates, mobilizations, pinboard, methods, page, nodes, orderby } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	const language = checklanguage(req.params?.language || req.session.language)

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	if (instance) {
		const { instance_vars } = res.locals
		if (!instance_vars) {
			const vars = await DB.general.tx(t => {
				return t.oneOrNone(`
					SELECT COALESCE(su_a3, adm0_a3) AS iso3, name FROM adm0_subunits
					WHERE (su_a3 ILIKE $1
						OR adm0_a3 ILIKE $1
						OR LOWER(name) = LOWER($1))
					LIMIT 1
				;`, [ decodeURI(instance) ]) // CHECK WHETHER THE instance IS A COUNTRY
				.then(result => {
					if (!result) {
						return t.oneOrNone(`
							SELECT id, name FROM teams
							WHERE LOWER(name) = LOWER($1)
							LIMIT 1
						;`, [ decodeURI(instance) ]) // CHECK WHETHER THE instance IS A TEAM: THE LIMIT 1 IS BECAUSE THERE IS NO UNIQUE CLAUSE FOR A TEAM NAME
						.then(result => {
							if (!result) {
								return DB.general.oneOrNone(`
									SELECT id, title, description FROM pinboards
									WHERE LOWER(title) = LOWER($1)
										AND status >= 2
									LIMIT 1
								;`, [ decodeURI(instance) ])  // CHECK WHETHER THE instance IS A PINBOARD: THE LIMIT 1 IS BECAUSE THERE IS NO UNIQUE CLAUSE FOR A TEAM NAME
								.then(async result => {
									if (!result) {
										return null;
									}
									return {
										object: 'pads',
										space: 'pinned',
										pinboard: result?.id,
										title: result?.title,
										description: result?.description,
										instanceId: result?.id,
										docType: 'pinboard',
									}
								}).catch(err => console.log(err))
							}
							return {
								object: 'pads',
								space: 'public',
								teams: [result?.id],
								title: result?.name,
								instanceId: result?.id,
								docType: 'team',
							};
						}).catch(err => console.log(err))
					}
					return {
						object: 'pads',
						space: rights >= read ? 'all' : 'public',
						countries: [result?.iso3],
						title: result?.name,
						instanceId: shortStringAsNum(`${result?.iso3}`.toLowerCase()),  // create a numeric id based on the iso3 characters
						docType: 'country',
					};
				}).catch(err => console.log(err))
			}).catch(err => console.log(err));
			if (!vars) {
				return null;  // force a redirect in render
			}
			if (vars.instanceId && vars.docType) {
				vars.readCount = await pagestats.getReadCount(vars.instanceId, vars.docType);
				await pagestats.recordRender(req, vars.instanceId, vars.docType);
			}
			space = vars.space
			pinboard = vars.pinboard
			teams = vars.teams
			countries = vars.countries
			// MAKE SURE THE object AND space ARE SET
			res.locals.instance_vars = vars
		} else {
			space = instance_vars.space
			pinboard = instance_vars.pinboard
			teams = instance_vars.teams
			countries = instance_vars.countries
		}
	}

	// FILTERS
	return new Promise(async resolve => {
		// BASE FILTERS
		const base_filters = []
		if (search) base_filters.push(DB.pgp.as.format(`p.full_text ~* $1`, [ parsers.regexQuery(search) ]))
		if (status) base_filters.push(DB.pgp.as.format(`p.status IN ($1:csv)`, [ status ]))

		let f_space = null
		if (space === 'private') f_space = DB.pgp.as.format(`p.owner IN ($1:csv)`, [ collaborators_ids ])
		else if (space === 'curated') f_space = DB.pgp.as.format(`(p.id IN (SELECT mc.pad FROM mobilization_contributions mc INNER JOIN mobilizations m ON m.id = mc.mobilization WHERE m.owner IN ($1:csv)) OR $2 > 2) AND (p.owner NOT IN ($1:csv) OR p.owner IS NULL) AND p.status < 2`, [ collaborators_ids, rights ])
		else if (space === 'shared') f_space = DB.pgp.as.format(`p.status = 2`)
		else if (space === 'reviewing') f_space = DB.pgp.as.format(`
			((p.id IN (SELECT mc.pad FROM mobilization_contributions mc INNER JOIN mobilizations m ON m.id = mc.mobilization WHERE m.owner IN ($1:csv)) OR $2 > 2)
				OR (p.owner IN ($1:csv)))
			AND p.id IN (SELECT pad FROM review_requests)
		`, [ collaborators_ids, rights ])
		else if (space === 'public') f_space = DB.pgp.as.format(`p.status = 3`) // THE !uuid IS FOR PUBLIC DISPLAYS
		else if (space === 'all') f_space = DB.pgp.as.format(`p.status >= 2`) // THE !uuid IS FOR PUBLIC DISPLAYS
		else if (space === 'pinned') {
			if (public) {
				if (pinboard) {
					const ownId = await ownDB();
					const pbpads = (await DB.general.any(`
						SELECT pad FROM pinboard_contributions WHERE pinboard = $1::INT AND db = $2 AND is_included = true
					`, [ pinboard, ownId ])).map(row => row.pad);
					const mobs = (await DB.general.any(`
						SELECT mobilization FROM pinboards WHERE id = $1::INT AND mobilization_db = $2
					`, [ pinboard, ownId ])).map(row => row.mobilization);
					f_space = DB.pgp.as.format(`
						((p.status > 2 OR (p.status > 1 AND p.owner IS NULL))
						AND (p.id IN ($1:csv)
						OR p.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($2:csv))))
					`, [ safeArr(pbpads, -1), safeArr(mobs, -1) ])
				}
				else f_space = DB.pgp.as.format(`(p.status > 2 OR (p.status > 1 AND p.owner IS NULL))`)
			} else { // THE USER IS LOGGED IN
				if (pinboard) {
					const ownId = await ownDB();
					const pbpads = (await DB.general.any(`
						SELECT pad FROM pinboard_contributions WHERE pinboard = $1::INT AND db = $2 AND is_included = true
					`, [ pinboard, ownId ])).map(row => row.pad);
					const mobs = (await DB.general.any(`
						SELECT mobilization FROM pinboards WHERE id = $1::INT AND mobilization_db = $2
					`, [ pinboard, ownId ])).map(row => row.mobilization);
					f_space = DB.pgp.as.format(`
						((p.owner IN ($1:csv) OR $2 > 2 OR p.status > 1)
						AND (p.id IN ($3:csv)
						OR p.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($4:csv))))
					`, [ collaborators_ids, rights, safeArr(pbpads, -1), safeArr(mobs, -1) ])
				}
				else f_space = DB.pgp.as.format(`(p.owner IN ($1:csv) OR $2 > 2 OR p.status > 1)`, [ collaborators_ids, rights ])
			}
		}
		else if (space === 'versiontree') {
			f_space = DB.pgp.as.format(`
				(p.version @> (SELECT version FROM pads WHERE id IN ($1:csv) AND (status >= p.status OR (owner IN ($2:csv) OR $3 > 2)))
				OR p.version <@ (SELECT version FROM pads WHERE id IN ($1:csv) AND (status >= p.status OR (owner IN ($2:csv) OR $3 > 2))))
			`, [ safeArr(nodes, -1), collaborators_ids, rights ])
		}
		else if (engagementtypes.some(d => space === `${d}s`)) {
			const type = engagementtypes.find(d => space === `${d}s`)
			f_space = DB.pgp.as.format(`p.id IN (SELECT docid FROM engagement WHERE contributor = $1 AND doctype = 'pad' AND type = $2)`, [ uuid, type ])
		}
		base_filters.push(f_space)

		// PLATFORM FILTERS
		const platform_filters = []
		if (pads) platform_filters.push(DB.pgp.as.format(`p.id IN ($1:csv)`, [ pads ]))
		if (contributors) platform_filters.push(DB.pgp.as.format(`p.owner IN ($1:csv)`, [ contributors ]))
		if (countries) {
			if (metafields.some((d) => d.type === "location")) {
				platform_filters.push(await DB.general.any(`
					SELECT 
				;`).then()
				.catch(err => console.log(err)))
			} else {
				platform_filters.push(await DB.general.any(`
					SELECT uuid FROM users WHERE iso3 IN ($1:csv)
				;`, [ countries ])
				.then(results => DB.pgp.as.format(`p.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
				.catch(err => console.log(err)))
			}
		} else if (regions) {
			platform_filters.push(await DB.general.any(`
				SELECT u.uuid FROM users u
				INNER JOIN countries c
				ON c.iso3 = u.iso3
				WHERE c.bureau IN ($1:csv)
			;`, [ regions ])
			.then(results => DB.pgp.as.format(`p.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		}
		if (teams) {
			platform_filters.push(await DB.general.any(`
				SELECT member FROM team_members WHERE team IN ($1:csv)
			;`, [ teams ])
			.then(results => DB.pgp.as.format(`p.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		}
		if (templates) platform_filters.push(DB.pgp.as.format(`p.template IN ($1:csv)`, [ templates ]))
		if (mobilizations) platform_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($1:csv))`, [ mobilizations ]))
		// ADDITIONAL FILTER FOR SETTING UP THE "LINKED PADS" DISPLAY
		// if (sources) platform_filters.push(DB.pgp.as.format(`AND p.source IS NULL`))

		// CONTENT FILTERS
		const content_filters = []
		metafields.forEach(d => {
			// TO DO: FINSIH THIS FOR OTHER METAFIELDS
			if (Object.keys(req.query).includes(d.label) || Object.keys(req.body).includes(d.label)) {
				if (['tag', 'index'].includes(d.type)) {
					content_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM tagging WHERE type = $1 AND tag_id IN ($2:csv))`, [ d.label, safeArr(req.query[d.label] || req.body[d.label], -1) ]))
				} else if (!['tag', 'index', 'location', 'attachment'].includes(d.type)) {
					content_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM metafields WHERE type = $1 AND name = $2 AND key IN ($3:csv))`, [ d.type, d.label, safeArr(req.query[d.label] || req.body[d.label], -1) ]))
				}
			}
		})

		// ORDER
		let order = DB.pgp.as.format(`ORDER BY p.date DESC`)
		if (orderby === 'random') order = DB.pgp.as.format(`ORDER BY RANDOM()`)

		let filters = [ base_filters.filter(d => d).join(' AND '), platform_filters.filter(d => d).join(' AND '), content_filters.filter(d => d).join(' AND ') ]
			.filter(d => d?.length)
			.map(d => `(${d.trim()})`)
			.join(' AND ')
			.trim()

		if (filters.length && filters.slice(0, 3) !== 'AND') filters = `AND ${filters}`

		resolve([ `AND ${f_space}`, order, page, filters ])
	})
}
