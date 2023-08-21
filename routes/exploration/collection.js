const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        throw new Error('uuid not set');
    }
    const { exploration_id: exploration_id_in } = req.query || {};
    const exploration_id = +exploration_id_in;
    if (!Number.isFinite(exploration_id)) {
        return res.status(422).json({
            message: `id is required: ?exploration_id=${exploration_id_in}`,
        });
    }
    return DB.general.tx(async (t) => {
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
