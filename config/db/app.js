if (['production', 'local-production'].includes(process.env.NODE_ENV)) {
  console.log('in production environment');
  exports.connection = {
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST !== 'localhost',
  };
} else {
  console.log('in local test envorinment');
  exports.connection = {
    database: process.env.database,
    port: process.env.port,
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
  };
}
