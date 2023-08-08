exports.collection = require('./collection.js');
exports.consent = require('./consent.js');
exports.create = require('./create.js');
exports.list = require('./list.js');
exports.doc = require('./doc.js');

exports.loginCheck = (req, res, next) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    return next();
}

exports.consentCheck = (req, res, next) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        throw new Error('uuid not set');
    }
    DB.general.tx(async (t) => {
        const hasConsent = (await t.one(`
            SELECT confirmed_feature_exploration FROM users WHERE uuid = $1
        `, [uuid])).confirmed_feature_exploration;
        if (!hasConsent) {
            return res.status(403).json({
                message: `${uuid} has to consent to using the exploration feature first!`,
            });
        }
        return next();
    });
}
