const DB = require('./db-config.js')
const express = require('express')
const path = require('path')
const bodyparser = require('body-parser')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)

const multer = require('multer')
const upload = multer({ dest: './tmp' })
const fs = require('fs')

const { execFile } = require('child_process')

const app = express()

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, './public')))
app.use('/scripts', express.static(path.join(__dirname, './node_modules')))
app.use(bodyparser.json({ limit: '50mb' }))
app.use(bodyparser.urlencoded({ limit: '50mb', extended: true }))



if (process.env.NODE_ENV === 'production') {
	app.set('trust proxy', 1) // trust first proxy
}

app.use(session({ 
	name: 'uid',
	secret: 'acclabspadspass',
	store: new pgSession({ pgPromise: DB.conn }),
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true, // THIS IS ACTUALLY DEFAULT
		secure: process.env.NODE_ENV === 'production',
		maxAge: 1000 * 60 * 60 * 24 * 1, // 1 DAY
		sameSite: 'lax'
	}
}))

const routes = require('./routes')

app.get('/', routes.redirect.home, routes.render.login)
app.route('/login')
	.get(routes.redirect.home, routes.render.login)
	.post(routes.process.login)
app.get('/logout', routes.process.logout)

app.route('/:lang/contribute/:object')
	.get(routes.render.login, routes.dispatch.contribute)
	.post(routes.process.login, routes.dispatch.contribute)
app.route('/:lang/edit/:object')
	.get(routes.render.login, routes.dispatch.edit)
	.post(routes.process.login, routes.dispatch.edit)
app.route('/:lang/view/:object')
	.get(routes.render.login, routes.dispatch.view)
	.post(routes.process.login, routes.dispatch.view)

app.post('/:lang/preview/:object', routes.dispatch.preview)
app.get('/:lang/analyse/:object', routes.dispatch.analyse)

app.route('/:lang/browse/:object/:space')
	.get(routes.render.login, routes.dispatch.browse)

app.post('/save/:object', routes.process.save)
app.post('/generate/:format', routes.process.generate)
app.post('/engage', routes.process.engage)
app.post('/validate', routes.process.validate)

app.get('/publish/:object', routes.process.publish)
app.get('/forward/:object', routes.process.forward)
app.get('/delete/:object', routes.process.delete)
app.post('/download/:object', routes.process.download)

// app.route('/:lang/mobilize/:space') // THIS SHOULD BE DEPRECATED
// 	.get(routes.render.login, routes.dispatch.mobilize)
// 	.post(routes.dispatch.mobilize)

app.post('/deploy', routes.process.deploy)
app.get('/demobilize', routes.process.demobilize)

// app.post('/intercept/:method', routes.process.intercept)
app.post('/call/api', routes.process.callapi)

// TO DO: CHECK IF THIS IS STILL RELEVANT
app.post('/:lang/:activity/:object/save', routes.process.save) // THIS PATH SHOULD NOT BE SO COMPLEX


app.post('/upload/img', upload.array('img'), routes.process.upload)
app.post('/upload/video', upload.array('video'), routes.process.upload)
app.post('/screenshot', routes.process.screenshot)


// THIS IS DEPRECATED
app.post('/storeImport', routes.render.login, routes.storeImport)
app.post('/forwardGeocoding', routes.forwardGeocoding) // TO DO: SET THIS UP IN PAD


// API
app.get('/api/skills', routes.api.skills)
app.get('/api/methods', routes.api.methods)
app.route('/api/datasources')
	.get(routes.api.datasources)
	.post(routes.api.datasources)



Array.prototype.flat = function () {
	return [].concat.apply([], this)
}
Array.prototype.diff = function (V2) {
	const diff = []
	this.forEach(d => { if (!V2.includes(d)) diff.push(d) })
	V2.forEach(d => { if (!this.includes(d)) diff.push(d) })
	return diff
}

app.get('*', routes.notfound)

app.listen(process.env.PORT || 2000, _ => console.log(`the app is running on port ${process.env.PORT}`))