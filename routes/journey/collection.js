const { DB } = include('config/');

module.exports = (req, res) => {
    // const { uuid } = req.session || {};
    // if (!uuid) {
    //     return res.status(401).json({
    //         message: 'must be logged in',
    //     });
    // }
    const uuid = '45e18bc3-8805-45e1-8c54-b356bcee4912';
    const { journey_id: journey_id_in } = req.query || {};
    const journey_id = +journey_id_in;
    if (!Number.isFinite(journey_id)) {
        return res.status(422).json({
            message: `id is required: ?journey_id=${journey_id_in}`,
        });
    }
    DB.general.result(`
        SELECT jd.db AS db, jd.doc_id AS doc_id, jd.is_relevant AS is_relevant
        FROM journey_docs AS jd, journey AS jy
        WHERE jd.journey_id = $1 AND jd.journey_id = jy.id AND jy.uuid = $2
    `, [journey_id, uuid]).then((result) => {
        res.json({
            uuid,
            journey_id,
            docs: result.rows.map((row) => ({
                db: row.db,
                doc_id: row.doc_id,
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
