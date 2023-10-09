const { app_title, DB } = include('config/')

module.exports = async (req, res) => {
	const { referer } = req.headers || {}
	let { app } = req.body || {}
	const { uuid, is_trusted } = req.session || {}

	const referer_url = new URL(referer)
	const referer_params = new URLSearchParams(referer_url.search)
	
	const trust_device = app.includes('(on trusted device)') ? 'true' : 'false'
	app = app.split(" (")[0]

	if(!is_trusted) referer_params.set('u_errormessage', 'This action can only be authorized on trusted devices.');
	if (!app && is_trusted) {
		// REMOVE ALL UNLABELED SESSIONS
			await DB.general.tx(async t => {
				//DELETE ALL ASSOCIATE DEVICES FOR ALL UNLABELLED SESSION
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
				UPDATE trusted_devices
				SET session_sid = NULL
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
				UPDATE trusted_devices
				SET session_sid = NULL
				  WHERE session_sid IN (
					SELECT sid
					FROM session
					WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' = $2
				  );
				`, [uuid, app])

				await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' = $2 AND sess -> 'device' ->> 'is_trusted' = $3;`, [ uuid, app, trust_device ])

			  }).catch(err =>console.log(err));
	}
	if (app === app_title && is_trusted) res.redirect('/')
	else res.redirect(`${referer_url.pathname}?${referer_params.toString()}`);
}
