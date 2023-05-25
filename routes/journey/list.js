const { DB } = include('config/');
const MAX_LENGTH = 40;
const ELLIPSIS = '…';

function limitPrompt(prompt) {
    const norm = prompt.replace(/[\s\n\r]+/, ' ');
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
    // const { uuid } = req.session || {};
    // if (!uuid) {
    //     return res.status(401).json({
    //         message: 'must be logged in',
    //     });
    // }
    const uuid = '45e18bc3-8805-45e1-8c54-b356bcee4912';
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
                created_at: row.created_at,
            })),
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
