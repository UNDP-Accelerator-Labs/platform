const { DB, fixed_uuid } = include('config/');

const MAX_LENGTH = 80;
const MAX_LENGTH_TH = 90;
const ELLIPSIS = '…';

function normalize(prompt) {
    return prompt.replace(/[\s\n\r]+/g, ' ').trim();
}

function limitPromptForPinboard(prompt) {
    if (prompt.length < MAX_LENGTH_TH) {
        return prompt;
    }
    const breakIx = prompt.lastIndexOf(' ', MAX_LENGTH);
    if (breakIx < 0) {
        return `${prompt.slice(0, MAX_LENGTH)}${ELLIPSIS}`;
    }
    return `${prompt.slice(0, breakIx)}${ELLIPSIS}`;
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
        const jid = await t.any(`
            SELECT id FROM journey WHERE uuid = $1 AND prompt = $2
        `, [uuid, prompt]);
        let journey;
        if (!jid) {
            const pbid = await t.one(`
                INSERT INTO pinboards (
                    owner,
                    title,
                    description,
                    mobilization_db,
                    mobilization
                )
                VALUES ($1, $2, '', NULL, NULL)
                ON CONFLICT (title, owner) DO NOTHING
                RETURNING id
            `, [uuid, limitPromptForPinboard(prompt)]).id;
            await t.none(`
                INSERT INTO pinboard_contributors (participant, pinboard)
                VALUES ($1, $2)
                ON CONFLICT (participant, pinboard) DO NOTHING
            `, [uuid, pbid]);
            const result = await t.one(`
                INSERT INTO journey (uuid, prompt, created_at, last_access, linked_pinboard)
                VALUES ($1, $2, NOW(), NOW(), $3)
                ON CONFLICT (uuid, prompt) DO UPDATE SET last_access = NOW()
                RETURNING id
            ;`, [uuid, prompt, pbid]);
            journey = result.id;
        } else {
            journey = jid[0].id;
            await t.none(`
                UPDATE journey
                SET last_access = NOW()
                WHERE id = $1
            `, [journey]);
        }
        return res.json({
            journey,
            prompt,
            message: `success! id[${journey}] uuid[${uuid}] prompt[${prompt}]`,
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
