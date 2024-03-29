const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        throw new Error('uuid not set');
    }
    if (req.method === 'GET') {
        DB.general.one(`
            SELECT confirmed_feature_exploration FROM users WHERE uuid = $1
        `, [uuid]).then((row) => {
            res.json({
                'uuid': uuid,
                'feature': 'exploration',
                'consent': row.confirmed_feature_exploration,
            });
        }).catch((err) => {
            console.log(err);
            res.status(500).json({
                message: 'error while processing request',
            });
        });
    } else if (req.method === 'PUT') {
        const { consent } = req.body || {};
        if (consent !== 'approve') {
            return res.status(403).json({
                message: 'consent must be set to approve',
            });
        }
        DB.general.none(`
            UPDATE users
            SET confirmed_feature_exploration = NOW()
            WHERE uuid = $1
        `, [uuid]).then(() => {
            res.json({
                'uuid': uuid,
                'feature': 'exploration',
                'consent': true,
            });
        }).catch((err) => {
            console.log(err);
            res.status(500).json({
                message: 'error while processing request',
            });
        });
    } else {
        console.log(`invalid method: ${req.method} for consent`);
        res.status(500).json({
            message: 'error while processing request',
        });
    }
};
