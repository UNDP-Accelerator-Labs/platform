const { app_title_short, feedbackRequiresLogin, DB } = include('config/');
const validActions = ['approve', 'dislike', 'neutral'];

module.exports = (req, res) => {
    const { action } = req.params || {};
	if (!validActions.includes(action)) {
        return res.json({
            status: 422,
            message: `unknown action: ${action}`,
        });
    }

    const { uuid } = req.session || {};
    if (!uuid && feedbackRequiresLogin) {
        return res.json({
            status: 401,
            message: 'must be logged in to provide feedback',
        });
    }
    const { id, prompt } = req.body || {};
    const db = app_title_short;
    const doc_id = +id;
    if (!Number.isFinite(doc_id) || !prompt) {
        return res.json({
            status: 422,
            message: `id and prompt are required: ${JSON.stringify(req.body)}`,
        });
    }
    console.log(action, db, doc_id, prompt);
    return res.json({
        status: 200,
        message: `success! action[${action}] db[${db}] id[${doc_id}] prompt[${prompt}]`,
    });
}
