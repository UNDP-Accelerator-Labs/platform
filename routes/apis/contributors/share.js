const { page_content_limit, ownDB, DB } = include('config/');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { email: sendEmail } = include('routes/helpers/');

module.exports = async (req, res) => {
  const { uuid, rights, username, email: c_email } = req.session || {};
  let { pinboard, email } = Object.keys(req.query)?.length
    ? req.query
    : Object.keys(req.body)?.length
    ? req.body
    : {};

  if (!uuid || !rights)
    return res.status(401).json({ message: 'Unauthorized', success: false });

  if (!pinboard)
    return res.status(400).json({ message: 'Please provide a board ID', success: false });

  if (!email)
    return res.status(400).json({ message: 'Please provide an email.', success: false });

  try {
    const data = await DB.general.tx(async (t) => {
      let user = await t.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

      if (!user) {
        if (!email.endsWith('@undp.org')) {
          throw new Error('Invalid email. Only @undp.org emails are allowed.');
        }

        const generatePassword = () => crypto.randomBytes(8).toString('hex');

        const autoGeneratedPassword = generatePassword();
        const hashedPassword = bcrypt.hashSync(autoGeneratedPassword, 10);

        const name = email.split('@')[0];

        user = await t.one(
          `INSERT INTO users (iso3, name, position, email, password, rights, confirmed, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
           RETURNING *`,
          ['NUL', name, 'Contributor', email, hashedPassword, 1, false]
        );
      }

      // Add user as a contributor
      await t.none(
        `INSERT INTO pinboard_contributors (participant, pinboard) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [user.uuid, pinboard]
      );

      // Fetch pinboard details
      const board = await t.oneOrNone('SELECT title FROM pinboards WHERE id = $1', [pinboard]);

      if (!board) {
        throw new Error('Pinboard not found.');
      }

      // Send email notification
      await sendEmail({
        to: email,
        cc: c_email,
        subject: `[SDG Commons] - You have been added to the "${board.title}" board`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Dear ${user.name},</p>
            <br/>
            <p>We are excited to inform you that you have been added as a contributor to the board on <a href="https://www.sdg-innovation-commons.org/boards/all/${pinboard}" style="color: #007bff; text-decoration: none;"><strong>"${board.title}"</strong></a> on SDG Commons.</p>
            <p>As a contributor, you have been invited to keep track of content related to topic ${board.title}. As you browse content on the SDG Commons from now on, please remember to bookmark any content that you find interesting that is related to topic ${board.title}</p>
            <p>To view or contribute to this board, please log in to your account via the platform.</p>
            <p>If you have any questions or require assistance, feel free to reach out to ${username} or contact our support team.</p>
            <p>We look forward to your valuable contributions!</p>
            <br/>
            <p>Best regards,</p>
            <p>UNDP Accelerator Labs Team</p>
          </div>
        `,
      });

      return {
        message: 'User found or created, and added as a contributor',
        success: true,
      };
    });

    // Return the result of the transaction
    return res.json(data);
  } catch (error) {
    console.error('Error handling user request:', error.message);
    return res.status(400).json({
      message: error.message || 'An error occurred while processing the request.',
      success: false,
    });
  }
};
