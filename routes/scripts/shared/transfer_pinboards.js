const { DB } = require('../../../config')
const { database: fInfoDB, host: fInfoHost, user: fInfoUser } = DB.conn.$cn;
const { database: tInfoDB, host: tInfoHost, user: tInfoUser } = DB.general.$cn;
console.log(
    `transferring from ${fInfoDB} ${fInfoHost} ${fInfoUser} ` +
    `to ${tInfoDB} ${tInfoHost} ${tInfoUser}}`);

const link_map = {
	'action-plans': 'https://acclabs-actionlearningplans.azurewebsites.net/',
	'experiments': 'https://acclabs-experiments.azurewebsites.net/',
	'pads': 'http://acclabs.azurewebsites.net/',
	'solutions-mapping': 'https://acclabs-solutionsmapping.azurewebsites.net//',
}
