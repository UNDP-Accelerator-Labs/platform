const { colors, app_storage, DB } = include('config/');
const { array, geo } = include('routes/helpers/');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');
const fs = require('fs');
const imgsize = require('image-size');

const t_xxsmall = 6;
const t_xsmall = 8;
const t_small = 9;
const t_mid_small = 10;
const t_main = 12;
const t_mid = 14;
const t_large = 16;
const t_xlarge = 24;
const t_xxlarge = 36;
const t_xxxlarge = 60;

const lang = 'en';

// doc.registerFont('Heading Font', 'fonts/Chalkboard.ttc', 'Chalkboard-Bold');

// 6233

DB.conn
  .one(
    `
	SELECT title, sections FROM pads
	WHERE id = 5929
;`,
  )
  .then(async (results) => {
    const { title, sections } = results;
    const doc = new PDFDocument({ size: 'A4' });
    doc.pipe(fs.createWriteStream('./routes/generate/test_02.pdf'));
    // doc.pipe(res)

    this.addTitle({ txt: title }, doc);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const { items } = section;
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        await this.populateSection(item, doc);
      }
    }

    doc.end();
  })
  .catch((err) => console.log(err));

exports.populateSection = (data, doc, inset = false) => {
  // MEDIA
  return new Promise(async (resolve) => {
    if (data.type === 'title') this.addTxt(data, doc, inset);
    if (data.type === 'img') await this.addImg(data, doc, inset);
    if (data.type === 'mosaic') await this.addMosaic(data, doc, inset);
    if (data.type === 'video') this.addVideo(data, doc, inset); // THIS IS NOT USED HERE
    if (data.type === 'drawing') this.addDrawing(data, doc, inset);
    if (data.type === 'txt') this.addTxt(data, doc, inset);
    if (data.type === 'embed') this.addEmbed(data, doc, inset);
    if (data.type === 'checklist') this.addChecklist(data, doc, inset);
    if (data.type === 'radiolist') this.addRadiolist(data, doc, inset);
    // META
    if (data.type === 'location') await this.addLocations(data, doc, inset);
    if (data.type === 'index') await this.addIndexes(data, doc, inset);
    if (data.type === 'tag') this.addTags(data, doc, inset);
    if (data.type === 'attachment') this.addAttachment(data, doc, inset);
    // GROUP
    if (data.type === 'group') await this.addGroup(data, doc, inset);
    doc.moveDown();
    resolve();
  });
};

exports.addInstruction = (data, doc, inset = false) => {
  const { instruction } = data;
  const { margins } = doc.page;

  if (instruction) {
    doc
      .fillColor(colors['light-grey'])
      .fontSize(t_mid_small)
      .text(instruction, inset ? margins.left * 1.5 : margins.left, doc.y)
      .fillColor(colors['dark-grey']); // RESET
  } else return false;
};

exports.addTitle = (data, doc, inset = false) => {
  let { txt } = data || {};

  doc
    .fillColor(colors['dark-blue'])
    .fontSize(t_xlarge)
    .text(txt)
    .fillColor(colors['dark-grey']); // RESET
  doc.moveDown();
};
exports.addImg = async (data, doc, inset = false) => {
  let { src, textalign } = data || {};
  const { width, height, margins } = doc.page;
  const maxwidth = width - margins.left - margins.right;
  const maxheight = height - margins.top - margins.bottom;
  if (!textalign) textalign = 'left';

  if (!src) src = null;
  // else if (src.isURL() || src.isBlob()) img.src = src
  else {
    if (app_storage) {
      // CREDIT TO: https://stackoverflow.com/questions/72036447/createobjecturl-error-argument-must-be-an-instance-of-blob-received-an-instan
      const buff = await fetch(
        new URL(
          `${app_storage.replace('consent', 'solutions-mapping')}/${src}`,
        ).href,
      ).then((response) => response.arrayBuffer());

      src = buff;
    } else {
      src = `/${src}`;
    }
  }

  this.addInstruction(data, doc, inset);

  const {
    width: imgwidth,
    height: imgheight,
    scale,
  } = getIMGsize(new Buffer.from(src), { maxwidth, maxheight });
  // DETERMINE WHETHER TO PUSH TO NEW PAGE
  if (doc.y + imgheight > height - margins.bottom) doc.addPage();

  if (src) {
    if (scale === 'fitted')
      doc.image(src, doc.x, doc.y, { width: imgwidth, height: imgheight });
    else if (scale === 'original')
      doc.image(src, doc.x, doc.y, {
        fit: [maxwidth, imgheight],
        align: textalign,
      });
  }
};
exports.addMosaic = async (data, doc, inset = false) => {
  let { srcs, verticalalign } = data || {};
  const { width, height, margins } = doc.page;
  if (!srcs) srcs = [];
  if (!verticalalign) verticalalign = 'center';

  this.addInstruction(data, doc, inset);

  const cols = srcs.length === 2 ? 2 : 3;
  const colgap = 15;

  const chunks = array.chunk.call(srcs, cols);

  const maxwidth =
    (width - margins.left - margins.right - colgap * (cols - 1)) / cols;
  const maxheight = height - margins.top - margins.bottom;

  // NEED TO DO SOME CHUNKING BASED ON COLS TO DETERMINE WHEN TO ADD PAGE
  let { x, y } = doc;

  for (let i = 0; i < chunks.length; i++) {
    const srcchunk = chunks[i];
    const row = [];

    for (let j = 0; j < srcchunk.length; j++) {
      let src = srcchunk[j];

      if (!src) src = null;
      // else if (src.isURL() || src.isBlob()) img.src = src
      else {
        if (app_storage) {
          // CREDIT TO: https://stackoverflow.com/questions/72036447/createobjecturl-error-argument-must-be-an-instance-of-blob-received-an-instan
          const buff = await fetch(
            new URL(
              `${app_storage.replace('consent', 'solutions-mapping')}/${src}`,
            ).href,
          ).then((response) => response.arrayBuffer());

          src = buff;
        } else {
          src = `/${src}`;
        }
      }
      const {
        width: imgwidth,
        height: imgheight,
        scale,
      } = getIMGsize(new Buffer.from(src), { maxwidth, maxheight });

      if (j % cols === 0) x = margins.left;
      else x += imgwidth + colgap;

      row.push({ src, width: imgwidth, height: imgheight, x, scale });
    }

    const offsetheight = Math.max(...row.map((d) => d.height));
    // DETERMINE WHETHER TO PUSH TO NEW PAGE
    if (y + offsetheight > maxheight) {
      doc.addPage();
      y = margins.top;
    }

    row.forEach((d) => {
      const { src, width, height, x, scale } = d;
      if (src) {
        if (scale === 'fitted')
          doc.image(src, x, y, {
            fit: [width, offsetheight],
            valign: verticalalign,
          });
        else if (scale === 'original')
          doc.image(src, x, y, {
            fit: [maxwidth, height],
            valign: verticalalign,
          });
      }
    });

    y += offsetheight;
  }
  doc.y = y;
};
exports.addVideo = (data, doc, inset = false) => {
  return false; // CANNOT ADD A VIDEO TO A PDF
};
exports.addDrawing = (data, doc, inset = false) => {
  let { shapes, size } = data || {};
  if (!shapes) shapes = [];
  shapes = shapes.filter((d) => d.points.length);
  if (!size) size = [];

  const { width, height, margins } = doc.page;
  const r = (width - margins.left - margins.right) / size[0];

  shapes.forEach((d) => {
    const { color, lineWidth, points } = d || {};
    if (!color) color = colors['dark-grey'];
    if (!lineWidth) lineWidth = 2;

    const path = `M ${points.join(' L ')}`;
    doc
      .translate(margins.left, doc.y)
      .scale(r)
      .rect(0, 0, size[0], size[1])
      .lineWidth(1)
      .stroke(colors['light-grey'])
      .lineWidth(lineWidth)
      .path(path)
      .stroke(color);
  });
};
exports.addTxt = (data, doc, inset = false) => {
  let { fontsize, fontweight, fontstyle, textalign, txt } = data || {};
  const { margins } = doc.page;

  if (!fontsize) fontsize = 1;
  if (!fontweight) fontweight = 'normal';
  if (!fontstyle) fontstyle = 'normal';
  if (!textalign) textalign = 'left';
  if (!txt) txt = '';

  this.addInstruction(data, doc, inset);

  doc
    .fontSize(t_main * fontsize)
    .text(txt, inset ? margins.left * 1.5 : margins.left, doc.y, {
      align: textalign,
    });
};
exports.addEmbed = (data, doc, inset = false) => {
  let { textalign, html, src } = data || {};
  const { margins } = doc.page;

  if (!textalign) textalign = 'left';
  if (!html) html = '';
  if (!src) src = null;

  this.addInstruction(data, doc, inset);

  if (src) {
    // NOTHING SHOULD HAPPEN HERE AS IT IS LIKELY A VIDEO
    return false;
  } else {
    doc
      .fontSize(t_main)
      .text(html, inset ? margins.left * 1.5 : margins.left, doc.y, {
        align: textalign,
      });
  }
};
exports.addChecklist = (data, doc, inset = false) => {
  let { fontsize, fontweight, fontstyle, options } = data || {};
  const { margins } = doc.page;

  if (!fontsize) fontsize = 1;
  if (!fontweight) fontweight = 'normal';
  if (!fontstyle) fontstyle = 'normal';
  if (!options) options = [];
  else {
    // THIS IS SO THAT ANY NULL OPTION (THAT MIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
    options.sort((a, b) => {
      if (a.name === b.name) return 0;
      else if (!a.name || !a.name.trim().length) return 1;
      else if (!b.name || !b.name.trim().length) return -1;
      else return a.id < b.id ? -1 : 1;
    });
  }

  this.addInstruction(data, doc, inset);
  doc.moveDown();

  options.forEach((d) => {
    doc //.font('fonts/Palatino.ttf')
      .fontSize(t_main * fontsize)
      .fillColor(d.checked ? colors['dark-grey'] : colors['light-grey'])
      .text(d.name, inset ? margins.left * 1.5 : margins.left, doc.y, {
        strike: !d.checked,
      })
      .fillColor(colors['dark-grey']); // RESET
    // TO DO: LOOK FOR d.checked
  });
};
exports.addRadiolist = (data, doc, inset = false) => {
  let { fontsize, fontweight, fontstyle, options } = data || {};
  const { margins } = doc.page;

  if (!fontsize) fontsize = 1;
  if (!fontweight) fontweight = 'normal';
  if (!fontstyle) fontstyle = 'normal';
  if (!options) options = [];
  else {
    // THIS IS SO THAT ANY NULL OPTION (THAT MIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
    options.sort((a, b) => {
      if (a.name === b.name) return 0;
      else if (!a.name || !a.name.trim().length) return 1;
      else if (!b.name || !b.name.trim().length) return -1;
      else return a.id < b.id ? -1 : 1;
    });
  }

  this.addInstruction(data, doc, inset);
  doc.moveDown();

  options.forEach((d) => {
    doc //.font('fonts/Palatino.ttf')
      .fontSize(t_main * fontsize)
      .fillColor(d.checked ? colors['dark-grey'] : colors['light-grey'])
      .text(d.name, inset ? margins.left * 1.5 : margins.left, doc.y, {
        strike: !d.checked,
      })
      .fillColor(colors['dark-grey']); // RESET
  });
};
exports.addLocations = async (data, doc, inset = false) => {
  // TO DO: FINISH THIS

  const { margins } = doc.page;

  this.addInstruction(data, doc, inset);

  const { centerpoints } = data;
  console.log('look for locations');
  if (centerpoints?.length) {
    const promises = geo.reversecode.code(
      centerpoints.map((d) => [d.lat, d.lng]),
      true,
    );
    const data = await Promise.all(promises);
    if (data?.length) {
      data.forEach((d, i) => {
        const { formatted } = d;
        const children = [];
        formatted.forEach((c) => {
          children.push(new TextRun({ text: `${c}*` }));
          // if (i === formatted.length - 1) children.push(new TextRun({ break: 1 }))
        });
        arr.push(
          new Paragraph({
            bullet: {
              level: 0,
            },
            children,
          }),
        );
      });
      arr.push(
        new Paragraph({ text: `* ${data[0].caption}`, style: 'caption' }),
      );
    }
  }
};
exports.addIndexes = async (data, doc, inset = false) => {
  let { tags, instruction } = data || {};
  if (!tags) tags = [];
  // MAKE SURE THE SDGs ARE SORTED BY key
  tags.sort((a, b) => a.key - b.key);
  const { width, height, margins } = doc.page;

  this.addInstruction(data, doc, inset);
  doc.moveDown();

  const srcs = tags.map(
    (d) => `./public/imgs/sdgs/${lang}/G${d.key || d}-c.png`,
  );

  // THIS IS ESSENTIALLY THE SAME CODE AS IN addMosaic
  const cols = 5;
  const colgap = 15;

  const chunks = array.chunk.call(srcs, cols);

  const imgwidth =
    (width - margins.left - margins.right - colgap * (cols - 1)) / cols;
  const maxheight = height - margins.top - margins.bottom;

  // NEED TO DO SOME CHUNKING BASED ON COLS TO DETERMINE WHEN TO ADD PAGE
  let { x, y } = doc;

  for (let i = 0; i < chunks.length; i++) {
    const srcchunk = chunks[i];
    const row = [];
    n = srcchunk.length;

    for (let j = 0; j < srcchunk.length; j++) {
      let src = srcchunk[j];

      if (!src) src = null;

      if (j % cols === 0) {
        if (n < cols) {
          x =
            margins.left +
            (width -
              margins.left -
              margins.right -
              n * imgwidth -
              (n - 1) * colgap) /
              2;
        } else x = margins.left;
      } else x += imgwidth + colgap;

      row.push({ src, width: imgwidth, height: imgwidth, x });
    }

    const offsetheight = Math.max(...row.map((d) => d.height));
    // DETERMINE WHETHER TO PUSH TO NEW PAGE
    if (y + offsetheight > maxheight) {
      doc.addPage();
      y = margins.top;
    }

    row.forEach((d) => {
      const { src, width, height, x, scale } = d;
      if (src) {
        doc.image(src, x, y, { fit: [width, height], valign: 'top' });
      }
    });

    y += offsetheight;
  }
  doc.y = y;
};
exports.addTags = (data, doc, inset = false) => {
  let { tags } = data || {};
  if (!tags) tags = [];
  const { width, margins } = doc.page;

  this.addInstruction(data, doc, inset);
  doc.moveDown();

  const maxwidth = width - margins.left - margins.right;

  let { x, y } = doc;
  x += 8;

  tags.forEach((d, i) => {
    let { name } = d;
    name = name.trim();

    doc.fontSize(t_main);

    const width = doc.widthOfString(name);
    const height = doc.currentLineHeight();

    doc
      .roundedRect(x - 8, y - 4, width + 16, height + 8, height)
      .fillColor(colors['light-2'])
      .fill();

    doc
      .fillColor(colors['mid-grey'])
      .text(name, x, y)
      .fillColor(colors['dark-grey']); // RESET

    x += width + 21;
    if (x > maxwidth) {
      x = margins.left + 8;
      doc.moveDown();
      y = doc.y;
    }
  });

  doc.y = y;
};
exports.addAttachment = (data, doc, inset = false) => {
  let { srcs } = data || {};
  if (!srcs) srcs = [];
  const { margins } = doc.page;

  this.addInstruction(data, doc, inset);

  srcs.forEach((d) => {
    doc
      .fontSize(t_main)
      .fillColor(colors['light-blue'])
      .text(d, inset ? margins.left * 1.5 : margins.left, doc.y, {
        link: d,
      })
      .fillColor(colors['dark-grey']); // RESET
  });
};
exports.addGroup = async (data, doc, inset = false) => {
  const { items } = data;
  const { width, height, margins } = doc.page;

  this.addInstruction(data, doc, inset);
  doc.moveDown();

  for (let i = 0; i < items.length; i++) {
    const group = items[i];
    for (let j = 0; j < group.length; j++) {
      const item = group[j];
      await this.populateSection(item, doc);
    }
  }

  doc.translate(0, 0);
};

function getIMGsize(src, kwargs = {}) {
  const { maxwidth, maxheight } = kwargs;

  try {
    let { width, height } = imgsize(src);
    let scale = 'original';
    const ratio = Math.min(maxwidth / width, maxheight / height);
    if (width > maxwidth || height > maxheight) {
      width = width * ratio;
      height = height * ratio;
      scale = 'fitted';
    }

    return { width, height, scale };
  } catch (e) {
    console.log('an error occurred trying to resize image');
    console.log(e);
    return { width: 0, height: 0, scale: null };
  }
}
