// THIS SCRIPT ONLY NEEDS TO BE RUN FOR THE SM PLATFORM
const { DB } = require('../../../config');

const store_instructions = true

DB.conn.tx(t => {
  return t.any(`
    SELECT id, title, sections FROM pads
  ;`)
  .then(pads => {
    const batch = []
    // CONSOLIDATE ATTACHMENT FORMATTING
    pads.forEach(d => {
      let fullTxt = `${d.title}\n\n`;

      d.sections.forEach(c => {
        if (store_instructions && c.title) fullTxt += `${c.title}\n`;
        if (store_instructions && c.lead) fullTxt += `${c.lead}\n`;

        c.items.forEach(b => {
          if (b.type === 'group' && b.items?.length > 0) {
            b.items.forEach(a => {
              a.forEach(z => {
                const text = retrieveText(z);
                fullTxt += `${text}\n`;
              })
            })
          } else {
            const text = retrieveText(b);
            fullTxt += `${text}\n`;
          }
        })
      })

      batch.push(t.none(`
        UPDATE pads 
        SET full_text = $1::TEXT
        WHERE id = $2::INT
      ;`, [ fullTxt, d.id ]))

    })
    return t.batch(batch)
    .catch(err => console.log(err))
  }).catch(err => console.log(err))
}).catch(err => console.log(err))


function retrieveText(d) {
  // TO DO: SECTION TITLE AND LEAD PARAGRAPH
  let text = '';
  if (d.type === 'title') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (datum.has_content) text += d.txt;
  } else if (['img', 'mosaic', 'video', 'files'].includes(d.type)) {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    // NO SYSTEMATIC WAY OF GETTING img FOR fullTxt
  } else if (d.type === 'drawing') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    // NO SYSTEMATIC WAY OF GETTING drawings FOR fullTxt
  } else if (d.type === 'txt') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (d.has_content) text += d.txt;
  } else if (d.type === 'embed') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (d.has_content) text += (d.html || '').replace(/(<([^>]+)>)/ig, '');
  } else if (['checklist', 'radiolist'].includes(d.type)) {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (d.has_content) text += d.options.filter((a) => a.name?.length && a.checked).map((a) => a.name).join('\n');
  } else if (d.type === 'location') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    // NO SYSTEMATIC WAY OF GETTING location FOR fullTxt
  } else if (['tag', 'index'].includes(d.type)) {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (d.has_content) text += (d.sdgs || d.tags).map((a) => `${a.type}: ${a.name}`).join('\n');
  } else if (d.type === 'attachment') {
    if (store_instructions && d.instruction) text += `${d.instruction}\n`;
    if (d.has_content) text += d.srcs.map((a) => `${a.name}: ${a}`).join('\n');
  } 
  return `${text}\n`
}

