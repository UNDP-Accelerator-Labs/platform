const { DB } = require('../../../config');
//FIX INVALID https:/ CONSENT LINK IN PAD RECORDS
DB.conn.tx(t => {
  return t.any(`
-- select * from pads where id = 4241

-- SELECT id, sections
-- FROM pads
-- WHERE true
--   AND EXISTS (
--     SELECT 1
--     FROM jsonb_array_elements(pads.sections) AS section,
--          jsonb_array_elements(section -> 'items') AS item,
--          jsonb_array_elements_text(item -> 'srcs') AS url
--     WHERE item ->> 'type' = 'attachment'
--       AND url LIKE 'https:/acclabplatforms.blob.core.%'
-- );


UPDATE pads
SET sections = (
    SELECT jsonb_agg(
        jsonb_set(
            section,
            '{items}',
            (
                SELECT jsonb_agg(
                    CASE
                        WHEN item ->> 'type' = 'attachment' AND item -> 'srcs' IS NOT NULL THEN
                            jsonb_set(
                                item,
                                '{srcs}',
                                (
                                    SELECT jsonb_agg(
                                        CASE
                                            WHEN url LIKE 'https:/acclabplatforms.blob.core.%' THEN
                                                replace(url, 'https:/acclabplatforms.blob.core.', 'https://acclabplatforms.blob.core.')
                                            ELSE
                                                url
                                        END
                                    )
                                    FROM jsonb_array_elements_text(item -> 'srcs') AS urls(url)
                                )
                            )
                        ELSE
                            item
                    END
                )
                FROM jsonb_array_elements(section -> 'items') AS item
            )
        )
    )
    FROM jsonb_array_elements(pads.sections) AS section
)
WHERE true
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(pads.sections) AS section,
         jsonb_array_elements(section -> 'items') AS item,
         jsonb_array_elements_text(item -> 'srcs') AS url
    WHERE item ->> 'type' = 'attachment'
      AND url LIKE 'https:/acclabplatforms.blob.core.%'
);
;`)
}).catch(err => console.log(err))
