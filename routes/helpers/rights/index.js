const { DB } = include('config/')

module.exports = async (_kwargs) => {
	const conn = _kwargs.connection || DB.general
	const { uuid } = _kwargs

	const right = await conn.oneOrNone(`
		SELECT COALESCE(rights, 0) AS rights FROM users
		WHERE uuid = $1
	;`, [ uuid ])

	const rights = right?.rights ?? 0;
    return rights;
}