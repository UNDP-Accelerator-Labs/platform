const { checkDevice } = require("../login/device-info")

const { app_title, DB } = include('config/')

module.exports = async (req, res) => {
	const { referer } = req.headers || {}
	const { app } = req.body || {}
	const { uuid } = req.session || {}
	const is_trusted = await checkDevice({req, conn: DB.general })

	const referer_url = new URL(referer)
	const referer_params = new URLSearchParams(referer_url.search)

	if(!is_trusted) referer_params.set('u_errormessage', 'This action can only be authorized on trusted devices.');
	if (!app && is_trusted) {
		// REMOVE ALL UNLABELED SESSIONS
			await DB.general.tx(async t => {
				// Update the trusted_devices table
				await t.none(`
				DELETE FROM trusted_devices
				  WHERE session_sid IN (
					SELECT sid
					FROM session
					WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' IS NULL
				  );
				`, [uuid]);

				await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' IS NULL;`, [uuid]);

			  });
	} else if (app.toLowerCase() === 'all' && is_trusted) {
		// REMOVE ALL SESSIONS FOR CURRENT USER
			await DB.general.tx(async t => {
				// Update the trusted_devices table
				await t.none(`
				  DELETE FROM trusted_devices
				  WHERE session_sid IN (
					SELECT sid
					FROM session
					WHERE sess ->> 'uuid' = $1
				  );
				`, [uuid]);

				await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1;`, [ uuid ])

			  });
	} else if( is_trusted ) {
		// REMOVE SESSIONS IN A GIVEN APPLICATION
			await DB.general.tx(async t => {
				// Update the trusted_devices table
				await t.none(`
				  DELETE FROM trusted_devices
				  WHERE session_sid IN (
					SELECT sid
					FROM session
					WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' = $2
				  );
				`, [uuid, app])

				await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' = $2;`, [ uuid, app ])

			  }).catch(err =>console.log(err));
	}
	if (app === app_title && is_trusted) res.redirect('/')
	else res.redirect(`${referer_url.pathname}?${referer_params.toString()}`);
}
