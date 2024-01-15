exports.check = require('./check.js')
exports.render = require('./render.js')
exports.process = require('./process.js')
exports.forgetPassword = require('./forget-password.js').forgetPassword
exports.createResetLink = require('./forget-password.js').createResetLink
exports.getResetToken = require('./forget-password.js').getResetToken
exports.updatePassword = require('./forget-password.js').updatePassword
exports.isPasswordSecure = require('./password-requirement.js').isPasswordSecure
exports.confirmDevice = require('./confirm-device.js').confirmDevice
exports.resendCode = require('./confirm-device.js').resendCode
exports.removeDevice = require('./confirm-device.js').removeDevice

exports.sso_redirect = require('./sso-redirect.js').ssoRedirect
exports.initiate_sso = require('./sso-inits.js')
exports.validate_sso = require('./sso-validate.js')