const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { prompt } = req.body || {};
    const upsert = DB.pgp.as.format(`
        INSERT INTO journey (uuid, prompt, created_at, last_access)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (uuid, prompt) DO UPDATE SET last_access = NOW()
        RETURNING id
    ;`, [uuid, prompt]);
    DB.general.one(upsert)
    .then((result) => {
        res.json({
            journey: result.id,
            message: `success! id[${result.id}] uuid[${uuid}] prompt[${prompt}]`,
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
