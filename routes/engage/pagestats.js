const { pagestats } = include('routes/helpers/')

module.exports = (req, res) => {
    const { doc_id: doc_id_in, doc_type, page_url } = req.body || {};
    const doc_id = +doc_id_in;
	if (!(doc_id > 0)) {
        return res.status(422).json({
            message: `invalid doc id: ${doc_id_in}`,
        });
    }
    if (!doc_type) {
        return res.status(422).json({
            message: `invalid doc type: ${doc_type}`,
        });
    }
    if (!page_url) {
        return res.status(422).json({
            message: `invalid page url: ${page_url}`,
        });
    }
    return pagestats.recordReadpage(req, doc_id, doc_type, page_url).then(() => {
        return res.status(200).json({
            message: 'read recorded',
        });
    }).catch((e) => {
        console.log(e);
        return res.status(200).json({
            message: 'read not recorded (check logs)',
        });
    });
};
