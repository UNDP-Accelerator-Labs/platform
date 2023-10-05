const { DB } = include('config/')

module.exports = async (req, res) => {
	const { uuid } = req.session || {}
	await DB.general.none(`
		DELETE FROM  trusted_devices
		WHERE session_sid IN (
		SELECT sid
		FROM session
		WHERE sess ->> 'uuid' = $1
		);
	`, [uuid]);
	req.session.destroy()
	res.redirect('/')
}