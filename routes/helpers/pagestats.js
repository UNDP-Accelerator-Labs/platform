const { default: fetch } = require("node-fetch");

const { DB, ownDB } = include('config/')
const ipInfoToken = process.env.IPINFO_TOKEN;

const ipCountry = async (req) => {
    if (!req.session.user_country || req.session.user_country === 'NUL') {
        const user_ip = req.ip;
        let country = 'NUL';
        if (ipInfoToken) {
            try {
                // free account at ipinfo.io allows 50k requests per month
                const resp = await fetch(`https://ipinfo.io/${user_ip}/country?token=${ipInfoToken}`);
                if (resp.ok) {
                    country = `${await resp.text()}`;
                } else {
                    console.log(`IP GEOLOCATION API ERROR: ${await resp.text()}`);
                }
            } catch(e) {
                // ignore errors
                console.log(`IP GEOLOCATION API ERROR: ${e}`);
            }
            if (country.length > 3) {
                console.log(`IP GEOLOCATION API ERROR: encountered invalid country ${country}`);
                country = 'NUL';
            }
        }
        req.session.user_country = country;
    }
    return req.session.user_country;
};
exports.ipCountry = ipCountry;

const recordView = async (id, page_url, user_country, is_view) => {
    const ownId = await ownDB();
    await DB.general.tx(async gt => {
        const page_stats = [];

        function addStat(padId, padDb, url, country) {
            if (is_view) {
                page_stats.push(gt.any(`
                INSERT INTO page_stats (pad, db, page_url, country, view_count)
                VALUES ($1, $2, $3, $4, 1)
                ON CONFLICT ON CONSTRAINT page_stats_pkey DO UPDATE SET view_count = page_stats.view_count + 1
                `, [padId ?? 0, padDb ?? 0, url ?? '', country ?? '']));
            } else {
                page_stats.push(gt.any(`
                INSERT INTO page_stats (pad, db, page_url, country, read_count)
                VALUES ($1, $2, $3, $4, 1)
                ON CONFLICT ON CONSTRAINT page_stats_pkey DO UPDATE SET read_count = page_stats.read_count + 1
                `, [padId ?? 0, padDb ?? 0, url ?? '', country ?? '']));
            }
        }

        addStat(id, ownId, null, null);
        addStat(id, ownId, page_url, user_country);

        await gt.batch(page_stats);
    });
};
exports.recordView = recordView;

exports.storeReadpage = async (req, id, page_url) => {
    const ownId = await ownDB();
    req.session.read_pad = id;
    req.session.read_db = ownId;
    req.session.read_url = page_url;
};

exports.recordReadpage = async (req, id, page_url) => {
    const ownId = await ownDB();
    const user_country = await ipCountry();
    const {read_pad, read_db, read_url} = req.session;
    if (read_pad === id && read_db === ownId && read_url === page_url) {
        await recordView(read_pad, read_url, user_country);
        req.session.read_pad = undefined;
        req.session.read_db = undefined;
        req.session.read_url = undefined;
    }
};
