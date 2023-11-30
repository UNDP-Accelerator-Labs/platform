// REF: https://lebcit.github.io/posts/csp-nonce-with-nodejs-and-ejs/
const crypto = require('crypto')
let lodashNonce = crypto.randomBytes(16).toString('hex')
module.exports = { lodashNonce }