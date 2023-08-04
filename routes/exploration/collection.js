const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { exploration_id: exploration_id_in } = req.query || {};
    const exploration_id = +exploration_id_in;
    if (!Number.isFinite(exploration_id)) {
        return res.status(422).json({
            message: `id is required: ?exploration_id=${exploration_id_in}`,
        });
    }
    return DB.general.tx(async (t) => {
        const hasConsent = (await t.one(`
            SELECT confirmed_feature_exploration FROM users WHERE uuid = $1
        `, [uuid])).confirmed_feature_exploration;
        if (!hasConsent) {
            return res.status(403).json({
                message: `${uuid} has to consent to using the exploration feature first!`,
            });
        }
        const result = await t.result(`
            SELECT pc.db AS db, pc.pad AS pad, pc.is_included AS is_included
            FROM pinboard_contributions AS pc
            INNER JOIN exploration AS jy ON jy.linked_pinboard = pc.pinboard
            WHERE jy.id = $1 AND jy.uuid = $2
        `, [exploration_id, uuid]);
        res.json({
            uuid,
            exploration_id,
            pads: result.rows.map((row) => ({
                db: row.db,
                pad: row.pad,
                is_included: row.is_included,
            })),
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
