const { DB, fixed_uuid } = include('config/');
const TimeAgo = require('javascript-time-ago');
const en = require('javascript-time-ago/locale/en');
const fr = require('javascript-time-ago/locale/fr');
const es = require('javascript-time-ago/locale/es');
const pt = require('javascript-time-ago/locale/pt');
TimeAgo.addLocale(fr);
TimeAgo.addLocale(es);
TimeAgo.addLocale(pt);
TimeAgo.addDefaultLocale(en);
const MAX_LENGTH = 40;
const ELLIPSIS = '…';

function limitPrompt(prompt) {
    const norm = prompt.replace(/[\s\n\r]+/g, ' ').trim();
    if (norm.length < MAX_LENGTH) {
        return norm;
    }
    const breakIx = norm.indexOf(' ', MAX_LENGTH - 1);
    if (breakIx < 0) {
        return `${norm.slice(0, MAX_LENGTH - 1)}${ELLIPSIS}`;
    }
    return `${norm.slice(0, breakIx)}${ELLIPSIS}`;
}

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { lang='en' } = req.query || {};
    const timeAgo = new TimeAgo(lang);
    DB.general.result(`
        SELECT id, prompt, created_at, last_access
        FROM journey
        WHERE uuid = $1
        ORDER BY last_access DESC
    `, [uuid]).then((result) => {
        res.json({
            uuid,
            journeys: result.rows.map((row) => ({
                id: row.id,
                prompt: row.prompt,
                short: limitPrompt(row.prompt),
                last_access: row.last_access,
                last_access_ago: timeAgo.format(row.last_access, 'round'),
                created_at: row.created_at,
                created_at_ago: timeAgo.format(row.created_at, 'round'),
            })),
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
