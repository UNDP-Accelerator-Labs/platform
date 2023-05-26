const { DB, fixed_uuid } = include('config/');

function normalize(prompt) {
    return prompt.replace(/[\s\n\r]+/, ' ').trim();
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
    const upsert = DB.pgp.as.format(`
        INSERT INTO journey (uuid, prompt, created_at, last_access)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (uuid, prompt) DO UPDATE SET last_access = NOW()
        RETURNING id
    ;`, [uuid, prompt]);
    DB.general.one(upsert)
    .then((result) => {
        res.json({
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
