const { DB } = include('config/') 
const { array, checklanguage, join } = include('routes/helpers/')

const check_authorization = require('../authorization.js')

module.exports = async (kwargs) => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, authorized } = kwargs || {}

	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	if (authorized === undefined) {
		const authorization = await check_authorization({ connection: conn, uuid, id, rights })
		authorized = authorization.authorized
	}

	if (authorized === false) return null
	else {
		return conn.task(t => {
			const batch = []
			
			// SELECT PEOPLE INVITED TO CONTRIBUTE
			batch.push(t.any(`
				SELECT participant AS owner
				FROM mobilization_contributors
				WHERE mobilization = $1::INT
			;`, [ id ])
			.then(async participants => {
				const data = await join.users(participants, [ language, 'owner' ])
				const country_agg = array.nest.call(data, { key: 'iso3', keyname: 'iso3', keep: 'country' })
				return country_agg.sort((a, b) => a?.country?.localeCompare(b?.country))
			}).catch(err => console.log(err)))

			// SELECT PEOPLE WHO ACTUALLY CONTRIBUTED
			batch.push(t.any(`
				SELECT p.owner 
				FROM pads p
				INNER JOIN mobilization_contributions mc
				ON mc.pad = p.id
				WHERE mc.mobilization = $1::INT
			;`, [ id ])
			.then(async contributors => {
				const data = await join.users(contributors, [ language, 'owner' ])
				const country_agg = array.nest.call(data, { key: 'iso3', keyname: 'iso3', keep: 'country' })
				return country_agg.sort((a, b) => a?.country?.localeCompare(b?.country))
			}).catch(err => console.log(err)))

			return t.batch(batch)
			.catch(err => console.log(err))

		}).then(results => {
			const [ participants, contributions ] = results
			return { participants, contributions }
		}).catch(err => console.log(err))
	}
}