const { DB } = include('config/')
module.exports = async (req, res) => {
	const { s_id } = req.query;

    DB.general.oneOrNone(`
        SELECT sess
        FROM public.session
        WHERE sid = $1
        AND expire > NOW()
        AND sess->>'uuid' IS NOT NULL;
    `, [s_id], d => d?.sess ?? null)
    .then(session=>{
        const sess = {
            uuid: session?.uuid,
            username: session?.username,
            rights: session?.rights
        }

        if(!req.session?.uuid) {
            delete sess.username
            return res.json(sess);
        }
        return res.json(sess);
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Server Error');
    })
}
