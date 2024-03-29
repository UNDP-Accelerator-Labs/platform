const { fixed_uuid, DB, ownDB } = include('config/');
const actionApprove = 'approve';
const actionDislike = 'dislike';
const actionNeutral = 'neutral';
const validActions = [actionApprove, actionDislike, actionNeutral];

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        throw new Error('uuid not set');
    }
    const { exploration: exploration_in, action, pad: pad_in } = req.body || {};
	if (!validActions.includes(action)) {
        return res.status(422).json({
            message: `unknown action: ${action}`,
        });
    }
    const exploration = +exploration_in;
    const pad = +pad_in;
    if (!Number.isFinite(exploration) || !Number.isFinite(pad)) {
        return res.status(422).json({
            message: `ids are required: ${JSON.stringify(req.body)}`,
        });
    }
    return DB.general.tx(async (t) => {
        const ownId = await ownDB();
        const jrow = await t.one(`
            SELECT uuid, linked_pinboard FROM exploration WHERE id = $1
        `, [exploration]);
        const batch = [];
        if (jrow.uuid === uuid) {
            batch.push(t.none(`
                UPDATE exploration
                SET last_access = NOW()
                WHERE id = $1
            `, [exploration]));
            if (action === actionNeutral) {
                batch.push(t.none(`
                    DELETE FROM pinboard_contributions
                    WHERE pinboard = $1
                    AND db = $2
                    AND pad = $3
                `, [jrow.linked_pinboard, ownId, pad]));
            } else {
                const isIncluded = action === actionApprove;
                batch.push(t.none(`
                    INSERT INTO pinboard_contributions (pinboard, db, pad, is_included)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (pinboard, db, pad)
                    DO UPDATE SET is_included = $4
                `, [jrow.linked_pinboard, ownId, pad, isIncluded]));
            }
        }
        const result = await t.batch(batch);
        if (result.errors) { // batch errors
            console.log(result);
            return res.status(500).json({
                message: 'error while processing request',
            });
        }
        if (result.length !== 2) { // uuid didn't match
            return res.status(422).json({
                message: 'exploration id does not exist',
            });
        }
        return res.json({
            exploration,
            pad,
            db: ownId,
            value: action,
            message: `success! exploration[${exploration}] db[${ownId}] pad[${pad}] value[${action}]`,
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
