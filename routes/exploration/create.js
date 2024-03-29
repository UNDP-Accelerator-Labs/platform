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
        throw new Error('uuid not set');
    }
    const { prompt: prompt_in } = req.body || {};
    const prompt = normalize(prompt_in);
    if (!prompt) {
        return res.status(422).json({
            message: 'prompt must not be empty',
        });
    }
    return DB.general.tx(async (t) => {
        const jid = await t.any(`
            SELECT id FROM exploration WHERE uuid = $1 AND prompt = $2
        `, [uuid, prompt]);
        let exploration;
        if (!jid.length) {
            const pbid = (await t.any(`
                INSERT INTO pinboards (
                    owner,
                    title,
                    description,
                    mobilization_db,
                    mobilization,
                    status
                )
                VALUES ($1, $2, '', NULL, NULL, 1)
                ON CONFLICT (title, owner) DO NOTHING
                RETURNING id
            `, [uuid, limitPromptForPinboard(prompt)]));
            if (!pbid.length) {
                pbid.push(await t.one(`
                    SELECT id FROM pinboards
                    WHERE owner = $1 AND title = $2 LIMIT 1;
                `, [uuid, limitPromptForPinboard(prompt)]));
            }
            await t.none(`
                INSERT INTO pinboard_contributors (participant, pinboard)
                VALUES ($1, $2)
                ON CONFLICT (participant, pinboard) DO NOTHING
            `, [uuid, pbid[0].id]);
            const result = await t.one(`
                INSERT INTO exploration (uuid, prompt, created_at, last_access, linked_pinboard)
                VALUES ($1, $2, NOW(), NOW(), $3)
                ON CONFLICT (uuid, prompt) DO UPDATE SET last_access = NOW()
                RETURNING id
            ;`, [uuid, prompt, pbid[0].id]);
            exploration = result.id;
        } else {
            exploration = jid[0].id;
            await t.none(`
                UPDATE exploration
                SET last_access = NOW()
                WHERE id = $1
            `, [exploration]);
        }
        return res.json({
            exploration,
            prompt,
            message: `success! id[${exploration}] uuid[${uuid}] prompt[${prompt}]`,
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            message: 'error while processing request',
        });
    });
}
