const logSQL = process.env.LOG_SQL !== 'false';
if (!logSQL) {
  console.warn('suppressing SQL output! use LOG_SQL to configure');
}
const initOptions = {
  query(e) {
    if (logSQL) console.log(e.query);
  },
};
const pgp = require('pg-promise')(initOptions);
const DB_app = require('./app.js').connection;
const DB_general = require('./general.js').connection;

exports.DB = { conn: pgp(DB_app), general: pgp(DB_general), pgp };
