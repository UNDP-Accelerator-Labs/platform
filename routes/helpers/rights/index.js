const { DB } = include('config/')

module.exports = async (_kwargs) => {
	const conn = _kwargs.connection || DB.general
	const { uuid } = _kwargs

	let rights = 0;
	if (uuid) {
		rights = await conn.oneOrNone(`
			SELECT COALESCE(rights, 0)::INT AS rights FROM users
			WHERE uuid = $1
		;`, [ uuid ], d => d.rights);
	}
    return rights;
}