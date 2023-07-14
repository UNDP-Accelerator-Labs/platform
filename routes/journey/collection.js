const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { journey_id: journey_id_in } = req.query || {};
    const journey_id = +journey_id_in;
    if (!Number.isFinite(journey_id)) {
        return res.status(422).json({
            message: `id is required: ?journey_id=${journey_id_in}`,
        });
    }
    DB.general.result(`
        SELECT jd.db AS db, jd.pad_id AS pad_id, jd.is_relevant AS is_relevant
        FROM journey_docs AS jd, journey AS jy
        WHERE jd.journey_id = $1 AND jd.journey_id = jy.id AND jy.uuid = $2
    `, [journey_id, uuid]).then((result) => {
        res.json({
            uuid,
            journey_id,
            pads: result.rows.map((row) => ({
                db: row.db,
                pad_id: row.pad_id,
                is_relevant: row.is_relevant,
            })),
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
