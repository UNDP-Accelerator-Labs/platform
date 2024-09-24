const { DB, own_app_url } = include('config/');
const { users } = require('./joins')
const sendMail = require('./email')
const fetch = require('node-fetch')

module.exports = async () => {

//CREATE A TRIGGER FUNCTION TO MAKE SURE `update_at` IS SET TO RECENT DATE WHEN PAD IS UPDATED
await DB.conn.tx(async t => {
    await t.any(`
        CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.update_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await t.any(`
        -- Check if the trigger exists
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_trigger
                WHERE tgname = 'set_timestamp'
                AND tgrelid = 'pads'::regclass
            ) THEN
                CREATE TRIGGER set_timestamp
                BEFORE UPDATE ON pads
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp();
            END IF;
        END;
        $$;
    `);
}).catch(err => console.log(err));



DB.conn.tx(t => {
  return t.any(`
        SELECT owner,
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'urls', (
                        SELECT jsonb_agg(url)
                        FROM jsonb_array_elements(pads.sections) AS section,
                                jsonb_array_elements(section -> 'items') AS item,
                                jsonb_array_elements_text(item -> 'srcs') AS url
                        WHERE item ->> 'type' = 'attachment'
                            AND url NOT LIKE 'https://acclabplatforms.blob.core.%'
                    )
                )
            ) AS data
        FROM pads
        WHERE update_at < '2024-08-26'
        AND status >= 2
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(pads.sections) AS section,
                jsonb_array_elements(section -> 'items') AS item,
                jsonb_array_elements_text(item -> 'srcs') AS url
            WHERE item ->> 'type' = 'attachment'
            AND url NOT LIKE 'https://acclabplatforms.blob.core.%'
        )
        GROUP BY owner;
`)
.then(async result => {
    const query_condition = DB.pgp.as.format(`AND u.rights >= 2`)
    const data = await users(result, [ 'en', 'owner' ], query_condition)
    return data
})
.then(async result => {
    for (const owner of result) {
      let brokenLinks = [];

      for (const item of owner.data) {
        for (const url of item.urls) {
            const link = `${own_app_url}en/edit/pad?id=${item.id}`
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok) {
              brokenLinks.push(link);
            }
          } catch (error) {
            brokenLinks.push(link); 
          }
        }
      }

      if (brokenLinks.length > 0) {
        // Send an email to the owner with the list of broken links
        await sendBrokenLinkEmail(owner, brokenLinks);
      }
    }
  })
}).catch(err => console.log(err))


async function sendBrokenLinkEmail(owner, brokenLinks) {
  
    const brokenLinksHtml = brokenLinks.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('');

    await sendMail({
        subject: 'Broken Links Detected in Your Content',
        to: owner.email,
        cc: process.env.ADMIN_EMAILS || '',
        html: `
            <p>Dear ${owner.ownername},</p>
    
            <p>It seems that some of the links in your content are broken or leading to pages that cannot be reached. Please review the following URLs and update them as necessary:</p>
            
            <ul>
                ${brokenLinksHtml}
            </ul>
            
            <p>Thank you for your attention to this matter.</p>
            
            <p>Best regards,<br/>
            Accelerator Labs</p>
        `
    });
}

}