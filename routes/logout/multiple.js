const { app_title, DB } = include('config/')

module.exports = async (req, res) => {
	const { referer } = req.headers || {}
	const { app } = req.body || {}
	const { uuid } = req.session || {}

	if (!app) {
		// REMOVE ALL UNLABELED SESSIONS
		await DB.general.tx(async t => {
			// Update the trusted_devices table
			await t.none(`
			DELETE FROM  trusted_devices
			  WHERE session_sid IN (
				SELECT sid
				FROM session
				WHERE sess ->> 'uuid' = $1
			  );
			`, [uuid]);

			await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' IS NULL;`, [uuid]);

		  });
	} else if (app.toLowerCase() === 'all') {
		// REMOVE ALL SESSIONS FOR CURRENT USER
		await DB.general.tx(async t => {
			// Update the trusted_devices table
			await t.none(`
			  DELETE FROM  trusted_devices
			  WHERE session_sid IN (
				SELECT sid
				FROM session
				WHERE sess ->> 'uuid' = $1
			  );
			`, [uuid]);

			await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1;`, [ uuid ])

		  });
	} else {
		// REMOVE SESSIONS IN A GIVEN APPLICATION
		await DB.general.tx(async t => {
			// Update the trusted_devices table
			await t.none(`
			  DELETE FROM  trusted_devices
			  WHERE session_sid IN (
				SELECT sid
				FROM session
				WHERE sess ->> 'uuid' = $1
			  );
			`, [uuid]);

			await t.none(`DELETE FROM session WHERE sess ->> 'uuid' = $1 AND sess ->> 'app' = $2;`, [ uuid, app ])

		  });
	}
	if (app === app_title) res.redirect('/')
	else res.redirect(referer)
}