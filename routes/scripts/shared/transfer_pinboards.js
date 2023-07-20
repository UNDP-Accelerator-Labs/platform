const { DB, app_id } = require('../../../config');
const link_map = {
    'ap': 'https://acclabs-actionlearningplans.azurewebsites.net/',
    'exp': 'https://acclabs-experiments.azurewebsites.net/',
    'global': 'https://acclabs.azurewebsites.net/',
    'sm': 'https://acclabs-solutionsmapping.azurewebsites.net/',
    'blogs': 'https://acclabs.azurewebsites.net/',
};
if (!link_map[app_id]) {
    throw new Error(`app_id '${app_id}' must be one of 'ap', 'exp', 'sm', 'global', or 'blogs'!`);
}
if (app_id === 'global') {
    console.warn('WARNING! global here refers to the database *not* the global platform!');
}
const action = process.env['ACTION'];

Array.prototype.clear = function () {
    this.length = 0;
};

const { database: fInfoDB, host: fInfoHost, user: fInfoUser } = DB.conn.$cn;
const { database: tInfoDB, host: tInfoHost, user: tInfoUser } = DB.general.$cn;
console.log(`action ${action || 'transfer'}`)
console.log(
    `transferring from ${fInfoDB} ${fInfoHost} ${fInfoUser} ` +
    `to ${tInfoDB} ${tInfoHost} ${tInfoUser}}`);
const db_map = {};

if (action === undefined || action === 'transfer') {
    DB.general.tx(async (gt) => {
        const gbatch = [];
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS extern_db (
                id SERIAL PRIMARY KEY UNIQUE NOT NULL,
                db VARCHAR(20) UNIQUE NOT NULL,
                url_prefix TEXT NOT NULL
            );
        `));
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS pinboards (
                id SERIAL PRIMARY KEY UNIQUE NOT NULL,
                old_id INT,
                old_db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
                title VARCHAR(99),
                description TEXT,
                owner uuid,
                status INT DEFAULT 0,
                display_filters BOOLEAN DEFAULT FALSE,
                display_map BOOLEAN DEFAULT FALSE,
                display_fullscreen BOOLEAN DEFAULT FALSE,
                slideshow BOOLEAN DEFAULT FALSE,
                "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                mobilization_db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
                mobilization INT
            );
        `));
        gbatch.push(gt.none(`ALTER TABLE pinboards DROP CONSTRAINT IF EXISTS unique_pinboard_owner;`));
        gbatch.push(gt.none(`
            ALTER TABLE pinboards ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner);
        `));
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS pinboard_contributors (
                participant uuid NOT NULL,
                pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
                PRIMARY KEY (participant, pinboard)
            );
        `));
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS pinboard_contributions (
                pad INT NOT NULL,
                db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
                pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
                is_included boolean NOT NULL DEFAULT true,
                PRIMARY KEY (pad, db, pinboard)
            );
        `));
        await gt.batch(gbatch);
        gbatch.clear();
        await DB.conn.tx(async (ct) => {
            const cbatch = [];
            cbatch.push(ct.none(`ALTER TABLE mobilizations DROP CONSTRAINT IF EXISTS mobilizations_collection_fkey;`));
            cbatch.push(ct.none(`ALTER TABLE mobilizations RENAME COLUMN collection TO old_collection;`));
            cbatch.push(ct.none(`ALTER TABLE pinboards RENAME TO _pinboards;`));
            cbatch.push(ct.none(`ALTER TABLE pinboard_contributors RENAME TO _pinboard_contributors;`));
            cbatch.push(ct.none(`ALTER TABLE pinboard_contributions RENAME TO _pinboard_contributions;`));
            await ct.batch(cbatch);
            cbatch.clear();
            await Promise.all(Object.keys(link_map).map(async (key) => {
                const db_id = await gt.one(`
                    INSERT INTO extern_db (db, url_prefix)
                    VALUES ($1, $2)
                    ON CONFLICT ON CONSTRAINT extern_db_db_key DO NOTHING
                    RETURNING id;
                `, [key, link_map[key]]);
                db_map[key] = db_id.id;
            }));
            const ownDB = db_map[app_id];
            const pinboards = await ct.manyOrNone(`SELECT * FROM _pinboards;`);
            (pinboards ?? []).forEach((row) => {
                gbatch.push(gt.one(`
                    INSERT INTO pinboards (
                        old_id,
                        old_db,
                        title,
                        description,
                        owner,
                        status,
                        display_filters,
                        display_map,
                        display_fullscreen,
                        slideshow,
                        "date",
                        mobilization_db,
                        mobilization)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING id, old_id;
                `, [
                    row.id,   // old_id
                    ownDB,  // old_db
                    row.title,  // title
                    row.description,  // description
                    row.owner,  // owner
                    row.status,  // status
                    row.display_filters,  // display_filters
                    row.display_map,  // display_map
                    row.display_fullscreen,  // display_fullscreen
                    row.slideshow,  // slideshow
                    row.date,  // date
                    row.mobilization !== null ? ownDB : null,  // mobilization_db
                    row.mobilization,  // mobilization
                ]));
            });
            const oldIdMap = new Map(((await gt.batch(gbatch)) ?? []).map((row) => [row.old_id, row.id]));
            gbatch.clear();
            const mids = await ct.manyOrNone(`
                SELECT DISTINCT old_collection
                FROM mobilizations
                WHERE old_collection IS NOT NULL
                GROUP BY old_collection;
            `);
            const mobIds = new Set(mids.map((row) => row.old_collection) ?? []);
            const pcont = await ct.manyOrNone(`
                SELECT DISTINCT participant, pinboard
                FROM _pinboard_contributors
                WHERE participant IS NOT NULL
                GROUP BY participant, pinboard;
            `);
            (pcont ?? []).forEach((row) => {
                gbatch.push(gt.none(`
                    INSERT INTO pinboard_contributors (participant, pinboard)
                    VALUES ($1, $2);
                `, [row.participant, oldIdMap.get(row.pinboard)]));
            });
            const pdocs = await ct.manyOrNone(`SELECT * FROM _pinboard_contributions;`);
            (pdocs ?? []).forEach((row) => {
                gbatch.push(gt.none(`
                    INSERT INTO pinboard_contributions (pad, db, pinboard)
                    VALUES ($1, $2, $3);
                `, [row.pad, ownDB, oldIdMap.get(row.pinboard)]));
            });
            await gt.batch(gbatch);
            gbatch.clear();
            if (mobIds.size) {
                console.log('NOTE: double check the following collection ids from the mobilization table:');
                console.log([...mobIds.values()].map((oldId) => ({
                    oldId,
                    newId: oldIdMap.get(oldId),
                })));
            }
        });
    }).catch((e) => {console.error(e);});
} else if (action === 'rollback') {
    DB.general.tx(async (gt) => {
        const gbatch = [];
        gbatch.push(gt.none(`DROP TABLE IF EXISTS pinboard_contributions CASCADE`));
        gbatch.push(gt.none(`DROP TABLE IF EXISTS pinboard_contributors CASCADE`));
        gbatch.push(gt.none(`DROP TABLE IF EXISTS pinboards CASCADE`));
        gbatch.push(gt.none(`DROP TABLE IF EXISTS extern_db CASCADE`));
        await gt.batch(gbatch);
        gbatch.clear();
        DB.conn.tx(async (ct) => {
            const cbatch = [];
            cbatch.push(ct.none(`ALTER TABLE _pinboard_contributions RENAME TO pinboard_contributions;`));
            cbatch.push(ct.none(`ALTER TABLE _pinboard_contributors RENAME TO pinboard_contributors;`));
            cbatch.push(ct.none(`ALTER TABLE _pinboards RENAME TO pinboards;`));
            cbatch.push(ct.none(`ALTER TABLE mobilizations RENAME COLUMN old_collection TO collection;`));
            cbatch.push(ct.none(`
                ALTER TABLE mobilizations ADD CONSTRAINT mobilizations_collection_fkey
                FOREIGN KEY (collection) REFERENCES pinboards (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE NO ACTION;
            `));
            await ct.batch(cbatch);
            cbatch.clear();
        });
    }).catch((e) => {console.error(e);});
} else if (action === 'finish') {
    DB.conn.tx(async (ct) => {
        const cbatch = [];
        cbatch.push(ct.none(`DROP TABLE IF EXISTS _pinboard_contributions CASCADE;`));
        cbatch.push(ct.none(`DROP TABLE IF EXISTS _pinboard_contributors CASCADE;`));
        cbatch.push(ct.none(`DROP TABLE IF EXISTS _pinboards CASCADE;`));
        await ct.batch(cbatch);
        cbatch.clear();
    });
} else {
    console.log(`unknown action ${action}`);
}
