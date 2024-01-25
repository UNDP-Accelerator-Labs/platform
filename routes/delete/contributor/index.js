const { modules, DB } = include('config/')
const { redirectUnauthorized } = include('routes/helpers/')
const cron = require('node-cron')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	let { id, type, date } = req.query || {}
	const { uuid, rights, public } = req.session || {}
	// CONVERT id TO ARRAY
	if (!Array.isArray(id)) id = [id]

	if (id.length && !public) {
		const now = new Date()
		const end_date = new Date(date)

		const usersql = DB.pgp.as.format(`
			UPDATE users
			SET rights = 0,
				left_at = $1
			WHERE uuid IN ($2:csv)
				AND (uuid IN (
					SELECT contributor FROM cohorts
					WHERE host = $3
				) OR $4 > 2)
		;`, [ date, id, uuid, rights ])

		let teamsql = undefined
		if (modules.some(d => d.type === 'teams' && d.rights.write <= rights)) {
			teamsql = DB.pgp.as.format(`
				DELETE FROM team_members
				WHERE member IN ($1:csv)
			;`, [ id ])
		}

		if (end_date >= now) {
			const min = end_date.getMinutes()
			const hour = end_date.getHours()
			const day = end_date.getDate()
			const month = end_date.getMonth() + 1
			const year = end_date.getFullYear()

			cron.schedule(`${min} ${hour} ${day} ${month} *`, function () {
				DB.conn.tx(t => {
					return t.none(usersql)
					.then(_ => {
						if (teamsql) {
							return t.none(teamsql)
							.then(_ => {
								return t.none(`
									DELETE FROM teams t
									WHERE t.host = $1
										AND t.id IN (
											SELECT team
											FROM team_members
											GROUP BY team
											HAVING COUNT (member) = 1
											AND $1 = ANY (array_agg(member))
										)
								;`, [ uuid ]).catch(err => console.log(err))
							}).catch(err => console.log(err))
						}
					}).catch(err => console.log(err))
				}).then(_ => {
					if (referer) res.redirect(referer)
					else redirectUnauthorized(req, res)
				}).catch(err => console.log(err))
			})
		} else {
			DB.general.tx(t => {
				return t.none(usersql)
				.then(_ => {
					if (teamsql) {
						return t.none(teamsql)
						.then(_ => {
							return t.none(`
								DELETE FROM teams t
								WHERE t.host = $1
									AND t.id IN (
										SELECT team
										FROM team_members
										GROUP BY team
										HAVING COUNT (member) = 1
										AND $1 = ANY (array_agg(member))
									)
							;`, [ uuid ]).catch(err => console.log(err))
						}).catch(err => console.log(err))
					}
				}).catch(err => console.log(err))
			}).then(_ => {
				if (referer) res.redirect(referer)
				else redirectUnauthorized(req, res)
			}).catch(err => console.log(err))
		}

		// THIS IS IN CASE WE WANT TO HAVE THE OPTION TO FULLY REMOVE A USER
		/*if (type === 'revoke') {
			DB.general.none(`
				UPDATE users
				SET rights = 0,
					left_at = $1
				WHERE uuid IN ($2:csv)
					AND uuid IN (
						SELECT contributor FROM cohorts
						WHERE host = $3
							OR $4 > 2
					)
			;`, [ date, id, uuid, rights ])
			.then(_ => res.redirect(referer))
			.catch(err => console.log(err))
		} else if (type === 'delete') { // THIS IS NOT ACTIVE
			DB.general.none(`
				DELETE FROM users
				WHERE uuid IN ($1:csv)
					AND uuid IN (
						SELECT contributor FROM cohorts
						WHERE host = $2
							OR $3 > 2
					)
			;`, [ id, uuid, rights ])
			.then(_ => res.redirect(referer))
			.catch(err => console.log(err))
		} else res.redirect(referer)*/
	} else {
		redirectUnauthorized(req, res)
	}
}
