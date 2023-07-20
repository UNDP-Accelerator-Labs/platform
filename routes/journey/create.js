const { DB, fixed_uuid } = include('config/');

function normalize(prompt) {
    return prompt.replace(/[\s\n\r]+/g, ' ').trim();
}

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { prompt: prompt_in } = req.body || {};
    const prompt = normalize(prompt_in);
    if (!prompt) {
        return res.status(422).json({
            message: 'prompt must not be empty',
        });
    }
    return DB.general.tx(async (t) => {
        const hasConsent = (await t.one(`
            SELECT confirmed_feature_journey FROM users WHERE uuid = $1
        `, [uuid])).confirmed_feature_journey;
        if (!hasConsent) {
            return res.status(403).json({
                message: `${uuid} has to consent to using the journey feature first!`,
            });
        }
        // TODO @joschi
        const result = await t.one(`
            INSERT INTO journey (uuid, prompt, created_at, last_access)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (uuid, prompt) DO UPDATE SET last_access = NOW()
            RETURNING id
        ;`, [uuid, prompt]);
        return res.json({
            journey: result.id,
            prompt,
            message: `success! id[${result.id}] uuid[${uuid}] prompt[${prompt}]`,
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
