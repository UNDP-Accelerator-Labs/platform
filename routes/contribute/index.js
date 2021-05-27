const { modules } = require('../../config.js')
const { language } = require('../header/')
const DB = require('../../db-config.js')

const pad = require('./pad/')
const template = require('./template/')
// const mobilizations = require('./mobilizations/') // TO DO

exports.contribute = require('./contribute').main
exports.edit = require('./edit').main
exports.view = require('./view').main
exports.save = require('./save').main
exports.publish = require('./publish').main
exports.delete = require('./delete').main