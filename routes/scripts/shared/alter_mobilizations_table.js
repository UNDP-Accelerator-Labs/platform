const { DB } = require('../../../config')
DB.conn.none(`ALTER TABLE mobilizations ADD COLUMN IF NOT EXISTS collection INT;`).catch(err => console.log(err))