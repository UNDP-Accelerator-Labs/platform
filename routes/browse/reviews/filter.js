// THIS IS HEAVILY INSPIRED BY browse/pads/filter.js
const { modules, engagementtypes, metafields, DB } = include('config')
const { checklanguage, datastructures, parsers } = include('routes/helpers')

exports.main = req => {
	const { space } = req.params || {}
	const { uuid, country, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	let { search, status, contributors, countries, pads, templates, mobilizations, pinboard, methods, page } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	let collaborators_ids = collaborators.filter(d => d.rights > 0).map(d => d.uuid)
	if (!collaborators_ids.length) collaborators_ids = [null]
	
	// BASE FILTERS
	const base_filters = []
	if (search) base_filters.push(DB.pgp.as.format(`AND p.full_text ~* $1`, [ parsers.regexQuery(search) ]))
	if (status) base_filters.push(DB.pgp.as.format(`
		-- BEGIN STATUS FILTER --
		AND (
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
	if (space === 'private') f_space = DB.pgp.as.format(`
		AND (
			(
				p.id IN (
					SELECT DISTINCT(pad) 
					FROM review_requests 
					WHERE id IN (SELECT request FROM reviewer_pool WHERE reviewer = $1) 
						OR $2 > 2
				) AND p.id NOT IN (SELECT pad FROM reviews WHERE reviewer = $1)
			) OR (
				p.id IN (SELECT review FROM reviews WHERE reviewer = $1 AND status < 2)
			)
		)
	`, [ uuid, rights ])

	if (space === 'shared') f_space = DB.pgp.as.format(`
		AND (p.id IN (SELECT pad FROM reviews WHERE reviewer = $1 AND status >= 2))
	`, [ uuid ])
		
	base_filters.push(f_space)

	// PLATFORM FILTERS
	const platform_filters = []
	if (pads) platform_filters.push(DB.pgp.as.format(`p.id IN (SELECT pad FROM reviews WHERE pad IN ($1:csv))`, [ pads ]))
	if (templates) platform_filters.push(DB.pgp.as.format(`p.template IN ($1:csv)`, [ templates ]))

	// CONTENT FILTERS
	const content_filters = []
	
	// ORDER
	const order = DB.pgp.as.format(`ORDER BY p.date DESC`)

	const filters = [ base_filters.filter(d => d).join(' '), platform_filters.filter(d => d).join(' OR '), content_filters.filter(d => d).join(' OR ') ].filter(d => d).join(' AND ')

	return [ f_space, order, page, filters ]

}