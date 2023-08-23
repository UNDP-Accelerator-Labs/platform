const { pagestats } = include('routes/helpers/')

module.exports = (req, res) => {
    const { pad_id: pad_id_in, page_url } = req.body || {};
    const pad_id = +pad_id_in;
	if (!(pad_id > 0)) {
        return res.status(422).json({
            message: `invalid pad id: ${pad_id_in}`,
        });
    }
    if (!page_url) {
        return res.status(422).json({
            message: `invalid page url: ${page_url}`,
        });
    }
    return pagestats.recordReadpage(req, pad_id, page_url).then(() => {
        return res.status(200).json({
            message: 'read recorded',
        });
    }).catch((e) => {
        console.log(e);
        return res.status(500).json({
            message: 'internal error',
        });
    });
};
