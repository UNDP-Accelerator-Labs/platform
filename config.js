exports.title = 'UNDP AccLabs Pads' // EDIT THIS

// DESIRED MODULES
const modules = ['pads', 'templates', 'mobilizations'] // EDIT THIS

if (modules.includes('mobilizations')) {
	if (!modules.includes('pads')) modules.push('pads')
	if (!modules.includes('templates')) modules.push('templates')
}
exports.modules = modules
// DISPLAY VARIABLES
exports.lazyload = false // EDIT THIS
exports.page_content_limit = 25 // EDIT THIS