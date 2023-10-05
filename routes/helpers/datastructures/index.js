const {
	app_id,
	app_title: title,
	app_description: description,
	app_languages,
	app_storage,
	app_suite_url,
	modules,
	metafields,
	media_value_keys,
	engagementtypes,
	lazyload,
	browse_display,
	welcome_module,
	page_content_limit,
	DB,
	ownDB,
} = include('config/')
const checklanguage = require('../language')
const join = require('../joins')
const array = require('../array');
const { checkDevice } = require('../../login/device-info');

function stripExplorationId(url) {
	return `${url}`.replace(/([?&])explorationid=[^&#]+&?/, '$1');
}

if (!exports.legacy) exports.legacy = {}

exports.sessiondata = _data => {
	let { uuid, name, email, team, collaborators, rights, public, language, iso3, countryname, bureau, lng, lat, device } = _data || {}

	// GENERIC session INFO
	const obj = {}
	obj.uuid = uuid || null
	obj.username = name || 'Anonymous user'
	obj.email = email || null
	obj.team = team || null
	obj.collaborators = collaborators || []
	obj.rights = rights ?? 0
	obj.public = public || false
	obj.language = language || 'en'
	obj.country = {
		iso3: iso3 || 'NUL',
		name: countryname || 'Null Island',
		bureau: bureau,
		lnglat: { lng: lng ?? 0, lat: lat ?? 0 }
	}
	obj.app = title
	obj.device = device || {}

	return obj
}
exports.sessionsummary = async _kwargs => {
	const conn = _kwargs.connection || DB.general
	const { uuid, req } = _kwargs
	const is_trusted = await checkDevice({ req, conn })

	return new Promise(resolve => {
		if (uuid && is_trusted) {
			conn.manyOrNone(`SELECT sess FROM session WHERE sess ->> 'uuid' = $1;`, [ uuid ])
			.then(sessions => {
				if (sessions) {
					// EXTRACT SESSION DATA
					const sessionsArr = sessions.map(d => d.sess)
					sessionsArr.forEach(d => {
						d.primarykey = `${d.app} (${d.device?.is_trusted ? 'on trusted device' : 'on untrusted device'})`
					})

					sessions = array.nest.call(sessions.map(d => d.sess), { key: 'primarykey', keep: ['app'] })
					.map(d => {
						const { values, ...data } = d
						return data
					})
					const total = array.sum.call(sessions, 'count')
					sessions.push({ key: 'All', count: total, app: 'All' })
					resolve(sessions)
				}
			}).catch(err => console.log(err))
		} else resolve(null)
	})
}
exports.pagemetadata = (_kwargs) => {
	const conn = _kwargs.connection || DB.conn
	const { page, pagecount, map, display, mscale, excerpt, req, res } = _kwargs || {}
	let { headers, path, params, query, session } = req || {}
	path = path.substring(1).split('/')
	let activity = path[1]
	const currentpage_url = `${req.protocol}://${req.get('host')}${req.originalUrl}`

	let { object, space, instance } = params || {}
	if (instance) {
		object = res.locals.instance_vars.object
		space = res.locals.instance_vars.space
		activity = 'browse'
	}

	if (session.uuid) { // USER IS LOGGED IN
		var { uuid, username: name, country, rights, collaborators, public, errormessage, sessions } = session || {}
	} else { // PUBLIC/ NO SESSION
		var { uuid, username: name, country, rights, collaborators, public } = this.sessiondata({ public: true }) || {}
	}
	const language = checklanguage(params?.language || session.language || this.sessiondata())
	const page_language = params?.language || 'en';

	const parsedQuery = {}
	for (let key in query) {
		if (key === 'search') {
			if (query[key].trim().length) parsedQuery[key] = query[key]
		} else {
			if (!Array.isArray(query[key])) parsedQuery[key] = [query[key]]
			else parsedQuery[key] = query[key]
		}
	}

	// ADD A CALL FOR ALL TEMPLATES (NAME + ID)
	return conn.tx(t => {
		const batch = []
		// TEMPLATE LIST
		if (modules.some(d => d.type === 'templates' && rights >= d.rights.read)) {
			batch.push(t.any(`
				SELECT id, title, owner, status FROM templates
				WHERE (status >= 2
					OR (status = 1 AND owner = $1))
					AND id NOT IN (SELECT template FROM review_templates)
				ORDER BY date DESC
			;`, [ uuid ]).catch(err => console.log(err))
			.then(async results => {
				const data = await join.users(results, [ language, 'owner' ])
				return data
			}).catch(err => console.log(err)))
		} else batch.push(null)
		// MOBILIZATIONS LIST (CREATOR)
		if (modules.some(d => d.type === 'mobilizations' && rights >= d.rights.read)) {
			batch.push(t.any(`
				SELECT m.id, m.title, m.owner, m.child, m.status,
					COALESCE((SELECT tm.id FROM mobilizations tm WHERE tm.source = m.id LIMIT 1), NULL) AS target_id,
					COALESCE((SELECT sm.id FROM mobilizations sm WHERE sm.id = m.source LIMIT 1), NULL) AS source_id
				FROM mobilizations m
				WHERE status = 2
					AND (owner = $1 OR $2 > 2)
				ORDER BY m.end_date DESC
			;`, [ uuid, rights ])
			.then(async results => {
				const data = await join.users(results, [ language, 'owner' ])
				return data
			}).catch(err => console.log(err)))
		} else batch.push(null)
		// MOBILIZATION LIST (PARTICIPANT)
		if (modules.some(d => d.type === 'mobilizations' && rights >= d.rights.read)) {
			batch.push(t.any(`
				SELECT m.id, m.owner, m.title, m.template, m.source, m.copy, m.status, m.child,
					to_char(m.start_date, 'DD Mon YYYY') AS start_date
				FROM mobilizations m
				WHERE (m.id IN (SELECT mobilization FROM mobilization_contributors WHERE participant = $1)
					OR m.owner = $1
				)
					OR m.public = TRUE
					AND m.status = 1
				ORDER BY m.start_date DESC
			;`, [ uuid ]).catch(err => console.log(err))
			.then(async results => {
				const data = await join.users(results, [ language, 'owner' ])
				return data
			}).catch(err => console.log(err)))
		} else batch.push(null)
		// INFO FROM THE GENERAL DB
		batch.push(DB.general.task(gt => {
			const gbatch = []
			gbatch.push(gt.any(`
				SELECT DISTINCT (name), language FROM languages
				WHERE language IN ($1:csv)
				ORDER BY language
			;`, [ app_languages ]))
			gbatch.push(gt.any(`
				SELECT language, secondary_languages FROM users
				-- SELECT COUNT (id)::INT AS count, language FROM users
				-- GROUP BY language
			;`))
			return gt.batch(gbatch)
			.catch(err => console.log(err))
		}).catch(err => console.log(err)))
		// REVIEW TEMPLATES
		if (modules.some(d => d.type === 'reviews' && rights >= d.rights.read)) {
			batch.push(t.any(`
				SELECT template, language FROM review_templates
			;`))//.then())
		} else batch.push(null)
		// PINBOARD LIST
		if (modules.some(d => d.type === 'pinboards' && rights >= d.rights.write)) {
			batch.push(ownDB().then(async (ownId) => {
				const pinboard_stats = await DB.general.any(`
					SELECT pb.id, pb.title, pb.status, COUNT (pc.pad) AS size,
						CASE WHEN EXISTS (
							SELECT 1 FROM exploration WHERE linked_pinboard = pb.id
						) THEN TRUE ELSE FALSE END AS is_exploration

					FROM pinboards pb
					INNER JOIN pinboard_contributions pc
						ON pc.pinboard = pb.id

					WHERE pb.owner = $1 AND pc.db = $2 AND pc.is_included = true
					GROUP BY pb.id
				;`, [ uuid, ownId ]);
				const pinboard_pads = await DB.general.any(`
					SELECT pb.id, pc.pad

					FROM pinboards pb
					INNER JOIN pinboard_contributions pc
						ON pc.pinboard = pb.id

					WHERE pb.owner = $1 AND pc.db = $2 AND pc.is_included = true
				;`, [ uuid, ownId ]);
				const pads = new Set();
				const pinpads = new Map();
				pinboard_pads.forEach((row) => {
					pads.add(row.pad);
					const padlist = pinpads.get(row.id) ?? [];
					padlist.push(row.pad);
					pinpads.set(row.id, padlist);
				});
				const padIds = pads.size ? [...pads] : [-1];
				const owners = new Map((await t.any(`
					SELECT p.id, p.owner
					FROM pads p
					WHERE p.id IN ($1:csv)
				;`, [ padIds ])).map((row) => [row.id, row.owner]));
				return pinboard_stats.map((stats) => {
					return {
						...stats,
						contributors: new Set(pinpads.get(stats.id).map((pad_id) => owners.get(pad_id))).size,
					}
				});
			}).catch(err => console.log(err)));
		} else batch.push(null)
		
		let hasJustLoggedIn = false;
		try {
			const referer = headers.referrer || headers.referer
			hasJustLoggedIn = (
				object === 'contributor'
				|| (referer && new URL(referer).pathname === '/login'));
		} catch (e) {
			console.log('hasJustLoggedInCheck', headers.referrer, headers.referer, object, e);
		}
		if (hasJustLoggedIn) {
			// GET MULTI-SESSION INFO
			batch.push(this.sessionsummary({ uuid, req }));
		} else {
			batch.push(null);
		}

		return t.batch(batch)
		.catch(err => console.log(err))
	}).then(async results => {
		let [ templates, mobilizations, participations, languagedata, review_templates, pinboards, sessions ] = results
		let [ languages, speakers ] = languagedata

		// THIS PART IS A BIT COMPLEX: IT AIMS TO COMBINE PRIMARY AND SECONDARY LANGUAGES OF USERS
		// TO WIDEN THE POSSIBLE REVIEWER POOL
		if (review_templates) {
			speakers = speakers.map(d => {
				const l = d.secondary_languages || []
				l.push(d.language)
				return l
			}).flat()
			speakers = array.count.call(speakers, { keyname: 'language' })

			review_templates = join.multijoin.call(review_templates, [ speakers, 'language' ])
			review_templates = join.multijoin.call(review_templates, [ languages, 'language' ])
			review_templates.forEach(d => {
				d.disabled = d.count < (modules.find(d => d.type === 'reviews')?.reviewers ?? 0)
			})
		} else review_templates = []

		const obj = {}
		obj.metadata = {
			site: {
				title,
				description,
				languages,
				modules,
				metafields,
				media_value_keys,
				engagementtypes,
				welcome_module,
				app_storage,
				own_db: await ownDB(),
				app_id,
				app_suite_url,
			},
			user: {
				uuid,
				name,
				country,
				rights,
				sessions
			},
			page: {
				title,
				instance_title: res?.locals.instance_vars?.title || null,
				instanceReadCount: res?.locals.instance_vars?.readCount || null,
				instanceDocType: res?.locals.instance_vars?.docType || null,
				instanceId: res?.locals.instance_vars?.instanceId || null,
				id: page ?? undefined,
				count: pagecount ?? null,
				language,
				page_language,
				public,
				excerpt: excerpt || { title: res?.locals.instance_vars?.title || title, txt: res?.locals.instance_vars?.description || description, p: false },

				path,
				referer: stripExplorationId(headers.referer),
				currentpage_url,
				originalUrl: req.originalUrl,
				activity,
				object,
				space,
				query: parsedQuery,

				lazyload,
				map: map || false,
				mscale: mscale || 'contain',
				display: display || browse_display,
				page_content_limit,

				errormessage
			},
			menu: {
				templates,
				mobilizations,
				participations,
				review_templates,
				pinboards
			}
		}
		return obj
	}).catch(err => console.log(err))
}
exports.legacy.publishablepad = (_kwargs) => { // THIS IS LEGACY FOR THE SOLUTIONS MAPPING PLATFORM
	const conn = _kwargs.connection || DB.conn
	const { data } = _kwargs

	const other_metadata = metafields.filter(d => !['tag', 'index', 'location'].includes(d.type))
	if (other_metadata.length > 0) {
		if (Array.isArray(data)) {
			return Promise.all(data.map(d => {
				return conn.any(`
					SELECT type, name, value FROM metafields
					WHERE pad = $1::INT
				;`, [ d.id ])
				.then(meta => {
					const nesting = array.nest.call(meta, { key: c => `${c.type}-${c.name}`, keep: ['type', 'name'] })
					const has_metadata = other_metadata.every(c => nesting.some(b => c.required && b.type === c.type && b.name === c.name && b.count <= (c.limit ?? Infinity)))

					d.publishable = (d.status >= 1 && has_metadata) || false
					return d
				}).catch(err => console.log(err))
			}))
		} else {
			return conn.any(`
				SELECT type, name, value FROM metafields
				WHERE pad = $1::INT
			;`, [ data.id ])
			.then(meta => {
				const nesting = array.nest.call(meta, { key: d => `${d.type}-${d.name}`, keep: ['type', 'name'] })
				const has_metadata = other_metadata.every(c => nesting.some(b => c.required && b.type === c.type && b.name === c.name && b.count <= (c.limit ?? Infinity)))

				data.publishable = (data.status >= 1 && has_metadata) || false
				return data
			}).catch(err => console.log(err))
		}
	} else {
		return new Promise(resolve => {
			if (Array.isArray(data)) {
				data.forEach(d => d.publishable = (d.status >= 1 || false))
			} else data.publishable = data.status >= 1 || false

			resolve(data)
		})
	}
}

// THE REST IS NOT USED FOR NOW
exports.pagedata = (_req, _data) => {
	const obj = {}
	obj.metadata = {
		site: {
			modules,
			metafields,
			engagementtypes,
			public,
			app_suite_url
		},
		user: {
			// TO DO: GET THIS FROM SESSION DATA OR FROM this.sessiondata
			name: username,
			country,
			rights
		},
		page: {
			title: pagetitle, // NEED TO FETCH SOMEWHERE
			id: 0,
			count: 0,
			lang, // NEED TO FETCH SOMEWHERE

			path, // NEED TO RETRIEVE path FROM req
			activity: path[1],
			object,
			space,
			query,

			lazyload,
			mscale: 'contain',
			display: browse_display
		},
		menu: {}, // TO DO: CHECK WHAT THIS IS FOR


	}
	obj.stats = {
		total: 0,
		filtered: 0,
		private: 0,
		curated: 0,
		shared: 0,
		public: 0,
		displayed: 0,
		breakdown: 0,
		persistent_breakdown: 0,
		contributors: 0,
		tags: 0
	}
	obj.data = {
		filters_menu: [],
		documents: [], // PADS, TEMPLATES, ETC
		sections: [] // THIS SHOULD BE DEPRECATED
		// clusters,
		// pinboards_list,
		// pinboard,
	} // TO DO: THIS IS A NEW SCHEMA (NOT USED NOW BUT CLEANER)
	return obj
}
