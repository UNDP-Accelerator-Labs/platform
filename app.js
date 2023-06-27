// INSPIRED BY https://coderwall.com/p/th6ssq/absolute-paths-require
global.include = path => require(`${__dirname}/${path}`)
global.rootpath = __dirname

const { app_id, app_suite, app_suite_secret, DB } = include('config/')
const express = require('express')
const path = require('path')
const bodyparser = require('body-parser')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)

const multer = require('multer')
const upload = multer({ dest: './tmp' })
const fs = require('fs')
const cors = require('cors');

const { spawn } = require('child_process')

const app = express()

// Enable CORS for all routes
app.use(cors());

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, './public')))
app.use('/scripts', express.static(path.join(__dirname, './node_modules')))
app.use('/config', express.static(path.join(__dirname, './config')))
app.use(bodyparser.json({ limit: '50mb' }))
app.use(bodyparser.urlencoded({ limit: '50mb', extended: true }))

if (process.env.NODE_ENV === 'production') {
	app.set('trust proxy', 1) // trust first proxy

	async function install_dependencies () {
		// MAKE SURE ffmpeg IS INSTALLED
		await new Promise(resolve => {
			const install_ffmpeg = spawn('apt-get', ['-y', 'install', 'ffmpeg'])
			install_ffmpeg.stdout.on('data', data => console.log(`stdout: ${data}`))
			install_ffmpeg.stderr.on('data', data => console.log(`stderr: ${data}`))
			install_ffmpeg.on('error', err => console.log(err))
			install_ffmpeg.on('exit', code => {
				console.log(`ffmpeg installation exited: ${code}`)
				resolve()
			})
		})
		// MAKE SURE zip IS INSTALLED
		await new Promise(resolve => {
			const install_ffmpeg = spawn('apt-get', ['-y', 'install', 'zip'])
			install_ffmpeg.stdout.on('data', data => console.log(`stdout: ${data}`))
			install_ffmpeg.stderr.on('data', data => console.log(`stderr: ${data}`))
			install_ffmpeg.on('error', err => console.log(err))
			install_ffmpeg.on('exit', code => {
				console.log(`zip installation exited: ${code}`)
				resolve()
			})
		})
	}
	install_dependencies().then(() => {}).catch(err => console.log(err));
}

const cookie = {
	httpOnly: true, // THIS IS ACTUALLY DEFAULT
	secure: process.env.NODE_ENV === 'production',
	maxAge: 5 * 1000 * 60 * 60 * 24 * 1, // 5 DAYS
	sameSite: 'lax',
};
if (app_id === 'local') {
	cookie.domain = process.env.NODE_ENV === 'production' ? '.azurewebsites.net' : 'localhost';
}
const sessionMiddleware = session({
	name: `${app_suite}-session`,
	// secret: 'acclabspadspass',
	secret: `${app_suite}-${app_suite_secret}-pass`,
	store: new pgSession({ pgPromise: DB.general }),
	resave: false,
	saveUninitialized: false,
	cookie,
})

app.use(sessionMiddleware)

const routes = require('./routes/')

// HEALTH-CHECK + INFO
let versionObj = null;

function getVersionString() {
	return new Promise((resolve) => {
		if (versionObj !== null) {
			resolve(versionObj);
			return;
		}
		fs.readFile('version.txt', (err, data) => {
			if (err) {
				versionObj = {
					'name': 'no version available',
					'commit': 'unknown',
					'app': `${app_id}`,
				};
			} else {
				const lines = data.toString().split(/[\r\n]+/);
				versionObj = {
					'name': lines[0] || 'no version available',
					'commit': lines[1] || 'unknown',
					'app': `${app_id}`,
				};
			}
			resolve(versionObj);
		});
	});
}

app.get('/version/', (req, res) => {
	getVersionString().then(vo => res.send(vo)).catch(err => {
		console.log(err);
		res.status(500).send({
			'name': 'error while reading version',
			'commit': 'unknown',
			'app': `${app_id}`,
		})
	});
});

// PUBLIC VIEWS
app.get('/', routes.redirect.home, routes.dispatch.public)
app.get('/:language/home', routes.dispatch.public)


app.route('/login') // TO DO: UPDATE FOR GET TO PASS LANGUAGE
	// .get(routes.redirect.home, routes.render.login)
	.get(routes.redirect.browse, routes.render.login)
	.post(routes.process.login)
app.get('/logout', routes.process.logout)

app.route('/:language/contribute/:object')
	.get(routes.check.login, routes.dispatch.contribute)
app.route('/:language/edit/:object')
	.get(routes.check.login, routes.dispatch.contribute)
app.route('/:language/view/:object')
	.get(routes.check.login, routes.dispatch.contribute)
app.route('/:language/import/:object')
	.get(routes.check.login, routes.render.import)
app.route('/:language/mobilize/:object')
	.get(routes.check.login, routes.dispatch.mobilize)

app.route('/:language/browse/:object/:space')
	.get(routes.check.login, routes.dispatch.browse)
	.post(routes.check.login, routes.dispatch.browse)

app.route('/:language/preview/:object/:space')
	.get(routes.check.login, routes.dispatch.browse)

app.route('/:language/print/:object/:space')
	.get(routes.check.login, routes.dispatch.print)

app.get('/:language/analyse/:object', routes.dispatch.analyse) // TO DO

app.post('/check/:object', routes.process.check)

app.post('/save/:object', routes.process.save)
app.post('/pin', routes.process.pin)
app.post('/engage', routes.process.engage)
app.post('/comment', routes.process.comment)
app.post('/validate', routes.process.validate)

app.route('/publish/:object')
	.get(routes.process.publish)
	.post(routes.process.publish)
app.get('/unpublish/:object', routes.process.unpublish)
app.post('/share/:object', routes.process.share)
app.get('/forward/:object', routes.process.forward)
app.get('/delete/:object', routes.process.delete)

app.post('/download/:object', routes.process.download)

app.route('/request/:object')
	.get(routes.process.request)
	.post(routes.process.request)
app.get('/accept/:object', routes.process.accept)
app.get('/decline/:object', routes.process.decline)


// app.post('/deploy', routes.process.deploy)
// app.get('/demobilize', routes.process.demobilize)

// app.post('/intercept/:method', routes.process.intercept)

app.post('/call/api', routes.process.callapi)

app.post('/upload/img', upload.array('img'), routes.process.upload)
app.post('/upload/video', upload.array('video'), routes.process.upload)
app.post('/upload/pdf', upload.array('pdf'), routes.process.upload)
app.post('/upload/xlsx', routes.check.login, routes.process.import) // TO DO: CHANGE path SCHEMA

app.post('/screenshot', routes.process.screenshot)


// TO DO: UPDATE SCHEMA BELOW
// app.post('/storeImport', routes.check.login, routes.process.import) // TO DO: CHANGE path SCHEMA
app.post('/forwardGeocoding', routes.forwardGeocoding) // UPDATE TO geocode/forward
app.post('/reverseGeocoding', routes.reverseGeocoding) // UPDATE TO geocode/forward


// API
app.route('/apis/:action/:object')
	.get(routes.check.login, routes.dispatch.apis)
	.post(routes.check.login, routes.dispatch.apis)

app.get('/api/skills', routes.api.skills) // TO DO: THIS SHOULD BE DEPRECATED
app.get('/api/methods', routes.api.methods) // TO DO: THIS SHOULD BE DEPRECATED
app.route('/api/datasources')
	.get(routes.api.datasources)
	.post(routes.api.datasources)

// INSTANCES
app.route('/:language/:instance')
	.get(routes.check.login, routes.dispatch.browse)

app.get('*', routes.notfound)

// RUN THE SERVER
app.listen(process.env.PORT || 2000, _ => {
	console.log(`the app is running on port ${process.env.PORT || 2000}`)
	getVersionString().then(vo => {
		console.log('name', vo.name);
		console.log('commit', vo.commit);
		console.log('app_id', app_id);
	}).catch(err => console.log(err));
})


// INITIATE ALL CRON JOBS
const cron = require('node-cron')
DB.conn.tx(t => {
	return t.none(`
		UPDATE mobilizations
		SET status = status + 1
		WHERE (start_date <= NOW() AND status = 0)
			OR (end_date <= NOW() AND status = 1)
	;`).then(_ => {
		return t.any(`
			SELECT id, start_date, end_date FROM mobilizations
			WHERE start_date >= NOW()
				OR end_date >= NOW()
		;`).then(results => {
			results.forEach(d => {
				const now = new Date()
				const start_date = new Date(d.start_date)
				const end_date = new Date(d.end_date)

				let expected_status
				let ref_date

				if (start_date >= now) {
					console.log('mobilization has not started')
					expected_status = 1
					ref_date = start_date
				}
				if (end_date >= now) {
					console.log('mobilization has not ended')
					expected_status = 2
					ref_date = end_date
				}

				const min = ref_date.getMinutes()
				const hour = ref_date.getHours()
				const day = ref_date.getDate()
				const month = ref_date.getMonth() + 1
				const year = ref_date.getFullYear()

				cron.schedule(`${min} ${hour} ${day} ${month} *`, function () {
					DB.conn.none(`
						UPDATE mobilizations
						SET status = $1
						WHERE id = $2
					;`, [ expected_status, d.id ])
					.catch(err => console.log(err))
				})
			})

		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}).catch(err => console.log(err))

// const io = require('socket.io')(server)
// // CODE BELOW COMES FROM: https://socket.io/how-to/use-with-express-session
// const wrap = middleware => (socket, next) => middleware(socket.request, {}, next)
// io.use(wrap(sessionMiddleware))


// io.on('connection', socket => {
// 	console.log('someone is connected')

// 	const session = socket.request.session
// 	// console.log(session)

// 	socket.on('hello', data => {
// 		console.log(data)
// 		socket.emit('world', data)
// 	})

// 	// socket.on('move-up', data => {

// 	// })

// 	socket.on('disconnect', _ => {
// 		// const dropid = connections.map(d => d.uuid).indexOf(socket.handshake.session.uuid)
// 		// connections.splice(dropid, 1)
// 		console.log('someone disconnected')
// 	})
// })
