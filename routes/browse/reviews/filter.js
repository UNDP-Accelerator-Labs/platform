// THIS IS HEAVILY INSPIRED BY browse/pads/filter.js
const { modules, engagementtypes, metafields, DB } = include('config/')
const { checklanguage, datastructures, parsers, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = async req => {
	let { object, space } = req.params || {}
	if (!space) space = Object.keys(req.query)?.length ? req.query.space : Object.keys(req.body)?.length ? req.body.space : {} // req.body?.space // THIS IS IN CASE OF POST REQUESTS (e.g. COMMING FROM APIS/ DOWNLOAD)
	
	const { uuid, country, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	let { search, status, contributors, countries, regions, pads, templates, mobilizations, pinboard, methods, page } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	// BASE FILTERS
	const base_filters = []
	if (search) base_filters.push(DB.pgp.as.format(`p.full_text ~* $1`, [ parsers.regexQuery(search) ]))
	if (status) base_filters.push(DB.pgp.as.format(`
		-- BEGIN STATUS FILTER --
		(
			(
				-- ASSIGNED REVIEWER
				$1 IN (SELECT reviewer FROM reviewer_pool 
					WHERE request IN (SELECT id FROM review_requests WHERE pad = p.id)
				) AND (
					-- PENDING REVIEW REQUESTS
					p.id IN (
						SELECT pad FROM review_requests
						WHERE id IN (SELECT request FROM reviewer_pool WHERE reviewer = $1)
							AND pad NOT IN (SELECT pad FROM reviews WHERE reviewer = $1)
							AND -1 IN ($2:csv)
					) 
					-- ACCEPTED REVIEWS
					OR p.id IN (
						SELECT review FROM reviews 
						WHERE reviewer = $1
							AND status IN ($2:csv)
					)
				)
			) OR (
				-- SUDO USER
				$3 > 2
				AND (
					-- REVIEW NOT ACCEPTED BY SUDO USER
					p.id IN (SELECT pad FROM review_requests)
						AND p.id NOT IN (SELECT pad FROM reviews WHERE reviewer = $1)
						AND -1 IN ($2:csv)
					-- REVIEW HAS BEEN ACCEPTED BY SUDO USER
					OR p.id IN (
						SELECT review FROM reviews 
						WHERE reviewer = $1
							AND status IN ($2:csv)
					)	
				)
			)
		)
		-- END STATUS FILTER --
	`, [ uuid, status, rights, modules.find(d => d.type === 'reviews')?.reviewers || 0 ]))

	let f_space = null
	if (space === 'pending') f_space = DB.pgp.as.format(`
		(p.id IN 
			(
				SELECT DISTINCT (pad) 
				FROM review_requests 
				WHERE id IN (
					SELECT request FROM reviewer_pool 
					WHERE (reviewer = $1 OR $2 > 2) 
					AND status = 0
				) 
			) AND p.id NOT IN (
				SELECT pad FROM reviews 
				WHERE reviewer = $1
				AND request IS NOT NULL
				AND request IN (
					SELECT id FROM review_requests
				)
			)
		)
	`, [ uuid, rights ])
	
	if (space === 'ongoing') f_space = DB.pgp.as.format(`
		p.id IN (SELECT review FROM reviews WHERE reviewer = $1 AND status < 2)
	`, [ uuid ])

	if (space === 'past') f_space = DB.pgp.as.format(`
		p.id IN (SELECT pad FROM reviews WHERE reviewer = $1 AND status >= 2)
	`, [ uuid ])
		
	base_filters.push(f_space)

	// PLATFORM FILTERS
	const platform_filters = []
	if (pads) platform_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM reviews WHERE pad IN ($1:csv))`, [ pads ]))
	if (contributors) platform_filters.push(DB.pgp.as.format(`p.owner IN ($1:csv)`, [ contributors ]))
	if (countries?.length) {
		if (metafields.some((d) => d.type === 'location')) {
			platform_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM locations WHERE iso3 IN ($1:csv))`, [ countries ]))
		} else {
			platform_filters.push(await DB.general.any(`
				SELECT uuid FROM users WHERE iso3 IN ($1:csv)
			;`, [ countries ])
			.then(results => DB.pgp.as.format(`p.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		}
	} else if (regions) {
		if (metafields.some((d) => d.type === 'location')) {
			platform_filters.push(await DB.general.tx(gt => {
				const gbatch = []
				gbatch.push(gt.any(`
					SELECT su_a3 AS iso3 FROM adm0_subunits
					WHERE undp_bureau IN ($1:csv)
						AND su_a3 <> adm0_a3
				;`, [ regions ]))
				gbatch.push(gt.any(`
					SELECT adm0_a3 AS iso3 FROM adm0
					WHERE undp_bureau IN ($1:csv)
				;`, [ regions ]))
				return gt.batch(gbatch)
				.then(results => {
					const [ su_a3, adm_a3 ] = results
					const locations = su_a3.concat(adm_a3)
					return DB.pgp.as.format(`p.id IN (SELECT pad FROM locations WHERE iso3 IN ($1:csv))`, [ locations.map(d => d.iso3) ])
				}).catch(err => console.log(err))
			}).catch(err => console.log(err)))
		} else {
			platform_filters.push(await DB.general.any(`
				SELECT u.uuid FROM users u
				INNER JOIN adm0_subunits c
					ON c.su_a3 = u.iso3
					OR c.adm0_a3 = u.iso3
				WHERE c.undp_bureau IN ($1:csv)
			;`, [ regions ])
			.then(results => DB.pgp.as.format(`p.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		}
	}
	if (templates) platform_filters.push(DB.pgp.as.format(`p.template IN ($1:csv)`, [ templates ]))
	if (mobilizations) platform_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization IN ($1:csv))`, [ mobilizations ]))

	// CONTENT FILTERS
	const content_filters = []
	metafields.forEach(d => {
		if (Object.keys(req.query).includes(d.label) || Object.keys(req.body).includes(d.label)) {
			if (['tag', 'index'].includes(d.type)) {
				content_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM tagging WHERE type = $1 AND tag_id IN ($2:csv))`, [ d.label, safeArr(req.query[d.label] || req.body[d.label], -1) ]))
			} else if (!['tag', 'index', 'location', 'attachment'].includes(d.type)) {
				content_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM metafields WHERE type = $1 AND name = $2 AND key IN ($3:csv))`, [ d.type, d.label, safeArr(req.query[d.label] || req.body[d.label], -1) ]))
			}
		}
	})
	
	// ORDER
	const order = DB.pgp.as.format(`ORDER BY p.date DESC`)

	let filters = [ base_filters.filter(d => d).join(' AND '), platform_filters.filter(d => d).join(' AND '), content_filters.filter(d => d).join(' AND ') ]
		.filter(d => d?.length)
		.map(d => `(${d.trim()})`)
		.join(' AND ')
		.trim()

	if (filters.length && filters.slice(0, 3) !== 'AND') filters = `AND ${filters}`

	return [ `AND ${f_space}`, order, page, filters ]

}