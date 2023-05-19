const validActions = ['approve', 'dislike', 'neutral'];

module.exports = (req, res) => {
    console.log('hi');
    const { action } = req.params || {};
	if (!validActions.includes(action)) {
        return res.redirect('/module-error');
    }

    const { id, prompt } = req.body || {}
    const { uuid } = req.session || {}
    console.log(id, prompt, action, uuid);
    return res.json({
        status: 200,
        src: null,
        message: 'TODO',
    });
}
