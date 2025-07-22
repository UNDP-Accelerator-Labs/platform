const { DB, app_id, own_app_url, app_suite_url } = include('config/')
const { redirectUnauthorized, join } = include('routes/helpers/')
const { email: sendEmail } = include('routes/helpers/');

module.exports = (req, res) => {
    const { uuid, rights } = req.session || {}
    const { object, id, message, source, action = 'add', comment_id } = req.body || {}

    if (uuid) {
        if (action === 'delete') {
            if (!comment_id) return res.json({ status: 400, message: 'Comment ID is required for deletion.' });

            DB.conn.none(`
                DELETE FROM comments
                WHERE id = $1 AND (contributor = $2)
            `, [comment_id, uuid, rights])
                .then(() => {
                    return res.json({ status: 200, message: 'Comment deleted successfully.' });
                })
                .catch(err => {
                    return res.json({ status: 500, message: 'An unexpected error occurred.' });
                })
            return;
        } else {
            var saveSQL = DB.pgp.as.format(`
                WITH inserted_comment AS (
                    INSERT INTO comments (contributor, doctype, docid, message, source)
                    VALUES ($1, $2, $3::INT, $4, $5)
                    RETURNING doctype, docid, contributor, source
                )
                SELECT 
                    COALESCE(
                        (SELECT c.contributor FROM comments c WHERE c.id = ic.source), -- Contributor of the source
                        p.owner -- Owner of the pad
                    ) AS owner
                FROM inserted_comment ic
                LEFT JOIN pads p ON ic.doctype = 'pad' AND p.id = ic.docid
            ;`, [uuid, object, id, message, source]);

            DB.conn.oneOrNone(saveSQL)
                .then(async result => {
                    if (!result) {
                        return res.json({ status: 404, message: 'No data returned from the query.' });
                    }

                    if (uuid === result.owner) return redirectUnauthorized(req, res);

                    // Send email notification to owner
                    const owner = await join.users(result, ['en', 'owner']);
                    const _base = app_id === 'sm' ? 'solution' : app_id === 'exp' ? 'experiment' : app_id === 'ap' ? 'action plan' : 'solution';
                    let link = `${app_suite_url}pads/${_base}/${id}#comments`;

                    if (!['sm', 'exp', 'ap'].includes(app_id)) {
                        link = `${own_app_url}en/view/pad?id=${id}`;
                    }

                    await sendEmail({
                        to: owner.email,
                        cc: process.env.NOTIFY_EMAIL,
                        subject: `[SDG Commons] - New Comment on Your Content`,
                        html: `
				  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
					<p>Dear ${owner.ownername},</p>
					<p>You have received a new comment on your content:</p>
					<p><strong>Comment:</strong> "${message}"</p>
					<p>You can view the comment and reply to it by clicking the link below:</p>
					<p><a href="${link}" style="color: #1a73e8;">View Comment</a></p>
					<br/>
					<p>Best regards,</p>
					<p>UNDP Accelerator Labs Team</p>
				  </div>
				`,
                    });

                    redirectUnauthorized(req, res);
                })
                .catch(err => {
                    if (err.code === DB.pgp.errors.queryResultErrorCode.noData) {
                        res.json({ status: 404, message: 'No data returned from the query.' });
                    } else {
                        res.json({ status: 500, message: 'An unexpected error occurred.' });
                    }
                })
        }
    } else res.json({ status: 400, message: 'You need to be logged in to engage with content.' })
}
