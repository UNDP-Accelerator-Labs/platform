const { DB } = include('config/');
const { email: sendEmail } = include('routes/helpers/');

const delete_pinboard = async (req, res) => {
    const { uuid, rights } = req.session || {};
    let { pinboard } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};

    if (!uuid || !rights) {
        return res.status(403).json({ message: 'Unauthorized access.' }); // Added return
    }

    if (!pinboard && req.body?.pinboard) {
        pinboard = req.body.pinboard
    }

    if (!pinboard) {
        return res.status(400).json({ message: 'Please provide a valid pinboard ID.' }); // Added return
    }

    if (!Array.isArray(pinboard)) {
        pinboard = [pinboard];
    }

    try {
        await DB.general.tx(async t => {
            // Delete contributions where the user is involved
            await t.none(`
                DELETE FROM pinboard_contributions
                WHERE pinboard = ANY($1)
                  AND pinboard IN (
                      SELECT p.id
                      FROM pinboards p
                      LEFT JOIN pinboard_contributors pc
                          ON pc.pinboard = p.id
                      WHERE (p.owner = $2 
                             OR EXISTS (
                                 SELECT 1 
                                 FROM pinboard_contributors pc_sub 
                                 WHERE pc_sub.pinboard = p.id 
                                   AND pc_sub.participant = $2
                             )
                             OR $3 > 2)
                        AND p.id = ANY($1)
                  );
            `, [pinboard, uuid, rights]);

            // Delete pinboards where the user is involved
            await t.none(`
                DELETE FROM pinboards
                WHERE id = ANY($1)
                  AND (owner = $2 
                       OR EXISTS (
                           SELECT 1 
                           FROM pinboard_contributors pc 
                           WHERE pc.pinboard = id 
                             AND pc.participant = $2
                       )
                       OR $3 > 2);
            `, [pinboard, uuid, rights]);
        });
        return res.status(200).json({ success: true, message: 'Pinboard and related contributions deleted successfully.' });
    } catch (error) {
        console.error('Error deleting pinboard:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while deleting the pinboard.', error });
    }
};



const create_pinboard = async (req, res) => {
    const { uuid } = req.session || {};
    const {
        title,
        description,
        mobilization,
        status = 1,
        display_filters = false,
        display_map = false,
        display_fullscreen = false,
        slideshow = false,
    } = req.body || {};

    // Validate required fields
    if (!uuid) {
        return res.status(403).json({ message: 'Unauthorized access.' });
    }

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: 'Title is required.' });
    }

    try {
        const result = await DB.general.tx(async (gt) => {
            // Insert new pinboard or resolve conflict
            const pinboard = await gt.oneOrNone(`
                INSERT INTO pinboards (title, owner, description, status, display_filters, display_map, display_fullscreen, slideshow, mobilization)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT ON CONSTRAINT unique_pinboard_owner
                    DO NOTHING
                RETURNING id, title, description, date;
            `, [title, uuid, description, status, display_filters, display_map, display_fullscreen, slideshow, mobilization]);

            if (pinboard) {
                return pinboard;
            }

            // Otherwise, retrieve the existing pinboard
            return gt.one(`
                SELECT id, title, description, date
                FROM pinboards
                WHERE title = $1 AND owner = $2;
            `, [title, uuid]);
        });

        const { id } = result;

        await DB.general.tx(async (gt) => {
            const batch = [];

            // Add the owner as a contributor
            batch.push(gt.none(`
                INSERT INTO pinboard_contributors (pinboard, participant)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING;
            `, [id, uuid]));

            // Execute all batch queries
            await gt.batch(batch);
        });

        return res.status(201).json({
            success: true,
            message: 'Board created successfully.',
            pinboard: result
        });

    } catch (error) {
        console.error('Error creating pinboard:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the board.',
            error
        });
    }
};



const request_collaboration = async (req, res) => {
    const { uuid, rights, username, email } = req.session || {};
    const { pinboard_id } = req.body || {};

    // Validate required fields
    if (!uuid) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    if (!pinboard_id) {
        return res.status(400).json({success: false, message: 'Board id is required.' });
    }

    if(rights > 2){
        return res.status(200).json({
            success: true,
            message: 'You are already a collaborator or owner of this board.'
        });
    }

    try {

        // Check if the user is already a collaborator or owner
        const existingCollaboration = await DB.general.oneOrNone(`
            SELECT 1
            FROM pinboards p
            LEFT JOIN pinboard_contributors pc
                ON pc.pinboard = p.id
            WHERE p.id = $1
                AND (p.owner = $2 OR pc.participant = $2)
        `, [pinboard_id, uuid]);

        if (existingCollaboration) {
            return res.status(200).json({
                success: true,
                message: 'You are already a collaborator or owner of this board.'
            });
        }

        const boardData = await DB.general.one(`
            SELECT p.owner, p.title, array_agg(pc.participant) AS contributors
            FROM pinboards p
            LEFT JOIN pinboard_contributors pc ON pc.pinboard = p.id
            WHERE p.id = $1
            GROUP BY p.owner, p.title
        `, [pinboard_id]);

        const ownerEmail = await getUserEmail(boardData.owner); 
        const contributorEmails = await Promise.all(boardData.contributors.map(async (uuid) => {
            return await getUserEmail(uuid); 
        }));

        
        const boardLink = `https://sdg-innovation-commons.org/boards/all/${pinboard_id}?share=${email}`;
        const boardTitle = boardData.title; 

        // Send email to the board owner and contributors
        await sendEmail({
            to: ownerEmail,
            cc: contributorEmails.join(", "), 
            subject: `[SDG Commons] - Collaboration Request for the "${boardTitle}" board`,
            html: `
             <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear Contributor,</p>
                <p>You have received a new collaboration request for the board <strong>"${boardTitle}"</strong> from ${username}.</p>
                <p>Please review the request and consider adding ${username} as a new contributor.</p>
                <p>To review and manage this, click <a href="${boardLink}">here</a> to visit the board.</p>
                <p>If you wish to grant ${username} access, you can share the board directly from the interface.</p>
                <p>Best regards,</p>
                <p>SDG Commons Team</p>
            </div>
            `,
        });

        //Send a notification to the requester
        await sendEmail({
            to: email,
            subject: `[SDG Commons] - Your request to contribute to the "${boardTitle}" board`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${username},</p>
                <p>Your request to contribute to the board <strong>"${boardTitle}"</strong> has been sent to the owner and contributors for review.</p>
                <p>You will be notified once a decision is made.</p>
                <p>Best regards,</p>
                <p>UNDP Accelerator Labs Team</p>
              </div>
            `,
        });

        return res.status(200).json({ success: true, message: 'Collaboration request sent successfully.' });

    } catch (error) {
        console.error('Error processing collaboration request:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while sending the collaboration request.',
            error
        });
    }
};



const handleCollaborationDecision = async (req, res) => {
    const { uuid, username } = req.session || {};
    const { pinboard_id, decision, requestor_email } = req.body || {};

    // Validate required fields
    if (!uuid) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    if (!pinboard_id) {
        return res.status(400).json({ success: false, message: 'Board ID is required.' });
    }

    if (!decision || !['approve', 'deny'].includes(decision)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing decision.' });
    }

    if (!requestor_email) {
        return res.status(400).json({ success: false, message: 'Requestor email is required.' });
    }

    try {
        // Check if the user is the owner or an existing contributor of the board
        const boardData = await DB.general.oneOrNone(`
            SELECT p.owner, p.title, array_agg(pc.participant) AS contributors
            FROM pinboards p
            LEFT JOIN pinboard_contributors pc ON pc.pinboard = p.id
            WHERE p.id = $1
            GROUP BY p.owner, p.title
        `, [pinboard_id]);

        if (!boardData) {
            return res.status(200).json({ success: false, message: 'Board not found.' });
        }

        const isAuthorized =
            boardData.owner === uuid || (boardData.contributors || []).includes(uuid);

        if (!isAuthorized) {
            return res.status(200).json({ success: false, message: 'You are not authorized to make decisions on this board.' });
        }

        const boardTitle = boardData.title;

        if (decision === 'approve') {
            // Get the UUID of the requestor using their email
            const requestorData = await DB.general.oneOrNone(`
                SELECT uuid
                FROM users
                WHERE email = $1
            `, [requestor_email]);
            
            if (!requestorData) {
                return res.status(200).json({ success: false, message: 'Requestor is not a valid user.' });
            }

            const requestorUuid = requestorData.uuid;

            // Check if the user is already a collaborator
            const isAlreadyContributor = await DB.general.oneOrNone(`
                SELECT 1
                FROM pinboard_contributors
                WHERE pinboard = $1 AND participant = $2
            `, [pinboard_id, requestorUuid]);

            if (isAlreadyContributor) {
                return res.status(200).json({
                    success: true,
                    message: `The user (${requestor_email}) is already a collaborator on this board.`,
                });
            }

            // Add requestor as a collaborator
            await DB.general.none(`
                INSERT INTO pinboard_contributors (pinboard, participant)
                VALUES ($1, $2)
            `, [pinboard_id, requestorUuid]);


            // Send email to the requester
            await sendEmail({
                to: requestor_email,
                subject: `[SDG Commons] - Collaboration Approved for "${boardTitle}"`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Dear User,</p>
                        <p>Your request to contribute to the board <strong>"${boardTitle}"</strong> has been approved by ${username}.</p>
                        <p>You now have full collaborator access to the board.</p>
                        <p>Best regards,</p>
                        <p>SDG Commons Team</p>
                    </div>
                `,
            });

            return res.status(200).json({
                success: true,
                message: `The user (${requestor_email}) has been granted collaborator access to the board.`,
            });
        } else if (decision === 'deny') {
            // Send email to the requester
            await sendEmail({
                to: requestor_email,
                subject: `[SDG Commons] - Collaboration Denied for "${boardTitle}"`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Dear User,</p>
                        <p>Your request to contribute to the board <strong>"${boardTitle}"</strong> has been denied.</p>
                        <p>If you have any questions, please contact the board owner or existing contributors for clarification.</p>
                        <p>Best regards,</p>
                        <p>SDG Commons Team</p>
                    </div>
                `,
            });

            return res.status(200).json({
                success: true,
                message: `The collaboration request from (${requestor_email}) has been denied.`,
            });
        }
    } catch (error) {
        console.error('Error processing decision:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing the decision.',
            error,
        });
    }
};


// Helper function to get user email by UUID
async function getUserEmail(uuid) {
    const user = await DB.general.one('SELECT email FROM users WHERE uuid = $1', [uuid]);
    return user?.email;
}


module.exports = {
    delete_pinboard,
    create_pinboard,
    request_collaboration,
    handleCollaborationDecision,
}