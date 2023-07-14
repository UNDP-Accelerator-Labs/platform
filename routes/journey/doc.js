const { app_title_short, fixed_uuid, DB } = include('config/');
const actionApprove = 'approve';
const actionDislike = 'dislike';
const actionNeutral = 'neutral';
const validActions = [actionApprove, actionDislike, actionNeutral];

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.json({
            status: 401,
            message: 'must be logged in',
        });
    }
    const { journey_id: journey_id_in, action, pad_id: pad_id_in } = req.body || {};
	if (!validActions.includes(action)) {
        return res.status(422).json({
            message: `unknown action: ${action}`,
        });
    }
    const db = app_title_short;
    const journey_id = +journey_id_in;
    const pad_id = +pad_id_in;
    if (!Number.isFinite(journey_id) || !Number.isFinite(pad_id)) {
        return res.status(422).json({
            message: `ids are required: ${JSON.stringify(req.body)}`,
        });
    }
    DB.general.tx((t) => {
        return t.one(`
            SELECT uuid FROM journey WHERE id = $1
        `, [journey_id]).then((result) => {
            const batch = [];
            if (result.uuid === uuid) {
                batch.push(t.none(`
                    UPDATE journey
                    SET last_access = NOW()
                    WHERE id = $1
                `, [journey_id]));
                if (action === actionNeutral) {
                    batch.push(t.none(`
                        DELETE FROM journey_docs
                        WHERE journey_id = $1
                        AND db = $2
                        AND pad_id = $3
                    `, [journey_id, db, pad_id]));
                } else {
                    const isRelevant = action === actionApprove;
                    batch.push(t.none(`
                        INSERT INTO journey_docs (journey_id, db, pad_id, is_relevant)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (journey_id, db, pad_id)
                        DO UPDATE SET is_relevant = $4
                    `, [journey_id, db, pad_id, isRelevant]));
                }
            }
            return t.batch(batch);
        }).catch((_) => {
            res.status(422).json({
                message: 'journey id does not exist',
            });
        });
    }).then((result) => {
        if (result === undefined) { // previous error
            return;
        }
        if (result.errors) { // batch errors
            console.log(result);
            res.status(500).json({
                message: 'error while processing request',
            });
            return;
        }
        if (result.length !== 2) { // uuid didn't match
            res.status(422).json({
                message: 'journey id does not exist',
            });
        } else {
            res.json({
                journey: journey_id,
                pad: pad_id,
                db: db,
                value: action,
                message: `success! journey_id[${journey_id}] db[${db}] pad_id[${pad_id}] value[${action}]`,
            });
        }
	}).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
