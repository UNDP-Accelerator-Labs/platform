const { DB, fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    if (req.method === 'GET') {
        DB.general.one(`
            SELECT confirmed_feature_journey FROM users WHERE uuid = $1
        `, [uuid]).then((row) => {
            res.json({
                'uuid': uuid,
                'feature': 'journey',
                'consent': row.confirmed_feature_journey,
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
            SET confirmed_feature_journey = NOW()
            WHERE uuid = $1
        `, [uuid]).then(() => {
            res.json({
                'uuid': uuid,
                'feature': 'journey',
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
