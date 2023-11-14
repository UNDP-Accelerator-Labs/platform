const { default: fetch } = require('node-fetch');
const { convertNum, fuzzNumber } = require('./numfmt.js');

const { DB, ownDB, globalDB } = include('config/');
const ipInfoToken = process.env.IPINFO_TOKEN;

const ipCountry = async (req) => {
  if (!req.session.user_country || req.session.user_country === 'NUL') {
    const user_ip = `${req.ip}`.replace(/:[0-9][0-9]+$/, '');
    let country = 'LCL';
    if (ipInfoToken && !['127.0.0.0', '::1'].includes(user_ip)) {
      try {
        // free account at ipinfo.io allows 50k requests per month
        const resp = await fetch(
          `https://ipinfo.io/${user_ip}/country?token=${ipInfoToken}`,
        );
        if (resp.ok) {
          country = `${await resp.text()}`.trim();
        } else {
          console.log(
            `IP GEOLOCATION API ERROR FOR IP ${user_ip}: ${await resp.text()}`,
          );
        }
      } catch (e) {
        // ignore errors
        console.log(`IP GEOLOCATION API ERROR FOR IP ${user_ip}: ${e}`);
      }
      if (country.length > 3) {
        console.log(
          `IP GEOLOCATION API ERROR: encountered invalid country ${country}`,
        );
        country = 'NUL';
      }
    }
    req.session.user_country = country;
  }
  return req.session.user_country;
};

const ownIdFor = async (doc_type) => {
  return ['pad', 'template'].includes(doc_type)
    ? await ownDB()
    : await globalDB();
};

const recordView = async (
  doc_id,
  doc_type,
  page_url,
  user_country,
  user_rights,
  is_view,
) => {
  const ownId = await ownIdFor(doc_type);
  const allowRecord = !(
    user_country === 'LCL' ||
    (user_rights > 2 && user_country === 'NUL')
  );
  await DB.general.tx(async (gt) => {
    const page_stats = [];

    function addStat(docId, docType, docDb, url, country, rights) {
      if (is_view) {
        page_stats.push(
          gt.any(
            `
                INSERT INTO page_stats (doc_id, doc_type, db, page_url, viewer_country, viewer_rights, view_count)
                VALUES ($1, $2, $3, $4, $5, $6, 1)
                ON CONFLICT ON CONSTRAINT page_stats_pkey DO UPDATE SET view_count = page_stats.view_count + 1
                `,
            [
              docId ?? 0,
              docType ?? '',
              docDb ?? 0,
              url ?? '',
              country ?? '',
              rights ?? -1,
            ],
          ),
        );
      } else {
        page_stats.push(
          gt.any(
            `
                INSERT INTO page_stats (doc_id, doc_type, db, page_url, viewer_country, viewer_rights, view_count)
                VALUES ($1, $2, $3, $4, $5, $6, 1)
                ON CONFLICT ON CONSTRAINT page_stats_pkey DO UPDATE SET read_count = page_stats.read_count + 1
                `,
            [
              docId ?? 0,
              docType ?? '',
              docDb ?? 0,
              url ?? '',
              country ?? '',
              rights ?? -1,
            ],
          ),
        );
      }
    }

    if (allowRecord) {
      addStat(doc_id, doc_type, ownId, null, null, null);
    }
    addStat(doc_id, doc_type, ownId, page_url, user_country, user_rights);

    await gt.batch(page_stats);
  });
};
exports.recordRender = async (req, doc_id, doc_type) => {
  const { originalUrl } = req;
  const { uuid, rights } = req.session || {};
  const user_country = await ipCountry(req);
  const page_url = originalUrl;
  const user_rights = uuid ? rights : -1;
  await recordView(
    doc_id,
    doc_type,
    page_url,
    user_country,
    user_rights,
    true,
  );
  await storeReadpage(req, doc_id, doc_type, page_url);
};

const storeReadpage = async (req, doc_id, doc_type, page_url) => {
  const ownId = await ownIdFor(doc_type);
  req.session.read_doc_id = doc_id;
  req.session.read_doc_type = doc_type;
  req.session.read_db = ownId;
  req.session.read_url = page_url;
};

exports.recordReadpage = async (req, doc_id, doc_type, page_url) => {
  const { uuid, rights } = req.session || {};
  const user_rights = uuid ? rights : -1;
  const ownId = await ownIdFor(doc_type);
  const user_country = await ipCountry(req);
  const { read_doc_id, read_doc_type, read_db, read_url } = req.session;
  if (
    +read_doc_id === +doc_id &&
    read_doc_type === doc_type &&
    +read_db === +ownId &&
    read_url === page_url
  ) {
    await recordView(
      doc_id,
      doc_type,
      read_url,
      user_country,
      user_rights,
      false,
    );
    req.session.read_doc_id = undefined;
    req.session.read_doc_type = undefined;
    req.session.read_db = undefined;
    req.session.read_url = undefined;
  } else {
    throw new Error(
      `mismatching base: ${read_doc_id}===${doc_id} ` +
        `${read_doc_type}===${doc_type} ${read_db}===${ownId} ` +
        `${read_url}===${page_url}`,
    );
  }
};

exports.getReadCount = async (doc_id, doc_type) => {
  const ownId = await ownIdFor(doc_type);
  const readCount = await DB.general.any(
    `
        SELECT read_count AS rc
        FROM page_stats
        WHERE doc_id = $1::INT AND doc_type = $2 AND db = $3 AND page_url = '' AND viewer_country = '' AND viewer_rights < 0
    `,
    [doc_id, doc_type, ownId],
  );
  return convertNum(fuzzNumber(readCount.length ? readCount[0].rc : 0));
};

const getReadCountBulk = async (doc_query, doc_type) => {
  const ownId = await ownIdFor(doc_type);
  const readMap = new Map(
    (
      await DB.general.any(
        `
        SELECT doc_id, read_count AS rc
        FROM page_stats
        WHERE doc_id IN $1:raw AND doc_type = $2 AND db = $3 AND page_url = '' AND viewer_country = '' AND viewer_rights < 0
    `,
        [doc_query, doc_type, ownId],
      )
    ).map((row) => [row.doc_id, convertNum(fuzzNumber(row.rc))]),
  );
  return readMap;
};

exports.putReadCount = async (doc_type, arr, id_fun) => {
  if (!arr || !arr.length) {
    return;
  }
  const ids = arr.map(id_fun);
  const readMap = await getReadCountBulk(
    DB.pgp.as.format(`($1:csv)`, [ids]),
    doc_type,
  );
  arr.forEach((d) => {
    d.readCount = readMap.get(id_fun(d));
  });
};
