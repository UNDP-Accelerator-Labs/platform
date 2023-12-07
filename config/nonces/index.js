// REF: https://lebcit.github.io/posts/csp-nonce-with-nodejs-and-ejs/
const crypto = require('crypto');
module.exports = ()=> crypto.randomBytes(32).toString('hex')
