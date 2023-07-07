const { DB } = require('../../../config')
const action = process.env['ACTION'];

const { database: fInfoDB, host: fInfoHost, user: fInfoUser } = DB.conn.$cn;
const { database: tInfoDB, host: tInfoHost, user: tInfoUser } = DB.general.$cn;
console.log(`action ${action || 'transfer'}`)
console.log(
    `transferring from ${fInfoDB} ${fInfoHost} ${fInfoUser} ` +
    `to ${tInfoDB} ${tInfoHost} ${tInfoUser}}`);
const link_map = {
	'action-plans': 'https://acclabs-actionlearningplans.azurewebsites.net/',
	'experiments': 'https://acclabs-experiments.azurewebsites.net/',
	'pads': 'http://acclabs.azurewebsites.net/',
	'solutions-mapping': 'https://acclabs-solutionsmapping.azurewebsites.net//',
};

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
                -- host INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
                owner uuid,
                -- public BOOLEAN DEFAULT FALSE,
                status INT DEFAULT 0,
                display_filters BOOLEAN DEFAULT FALSE,
                display_map BOOLEAN DEFAULT FALSE,
                display_fullscreen BOOLEAN DEFAULT FALSE,
                slideshow BOOLEAN DEFAULT FALSE,
                "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                mobilization_db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
                mobilization INT  -- THIS IS TO CONNECT A PINBOARD DIRECTLY TO A MOBILIZATION
            );
        `));
        gbatch.push(gt.none(`ALTER TABLE pinboards DROP CONSTRAINT IF EXISTS unique_pinboard_owner;`));
        gbatch.push(gt.none(`
            ALTER TABLE pinboards ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner);
        `));
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS pinboard_contributors (
                id SERIAL PRIMARY KEY UNIQUE NOT NULL,
                -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
                participant uuid,
                pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE
            );
        `));
        gbatch.push(gt.none(`ALTER TABLE pinboard_contributors DROP CONSTRAINT IF EXISTS unique_pinboard_contributor;`));
        gbatch.push(gt.none(`
            ALTER TABLE pinboard_contributors ADD CONSTRAINT unique_pinboard_contributor UNIQUE (participant, pinboard);
        `));
        gbatch.push(gt.none(`
            CREATE TABLE IF NOT EXISTS pinboard_contributions (
                pad INT UNIQUE NOT NULL,
                db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
                pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
                PRIMARY KEY (pad, db, pinboard)
            );
        `));
        await gt.batch(gbatch);
        await DB.conn.tx(async (ct) => {
            const cbatch = [];
            cbatch.push(ct.none(`ALTER TABLE mobilizations DROP CONSTRAINT IF EXISTS mobilizations_collection_fkey;`));
            cbatch.push(ct.none(`ALTER TABLE mobilizations RENAME COLUMN collection TO old_collection;`));
            cbatch.push(ct.none(`ALTER TABLE mobilizations ADD COLUMN IF NOT EXISTS collection_id INT;`));
            await ct.batch(cbatch);
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
        DB.conn.tx(async (ct) => {
            const cbatch = [];
            cbatch.push(ct.none(`ALTER TABLE mobilizations DROP COLUMN collection_id;`));
            cbatch.push(ct.none(`ALTER TABLE mobilizations RENAME COLUMN old_collection TO collection;`));
            cbatch.push(ct.none(`
                ALTER TABLE mobilizations ADD CONSTRAINT mobilizations_collection_fkey
                FOREIGN KEY (collection) REFERENCES pinboards (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE NO ACTION;`));
            await ct.batch(cbatch);
        });
    }).catch((e) => {console.error(e);});
} else if (action === 'finish') {
    // TODO
} else {
    console.log(`unknown action ${action}`);
}
