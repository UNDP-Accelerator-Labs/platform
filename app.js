// INSPIRED BY https://coderwall.com/p/th6ssq/absolute-paths-require
global.include = (path) => require(`${__dirname}/${path}`);
global.rootpath = __dirname;

const { app_id, app_suite, app_suite_secret, DB, csp_links } =
  include("config/");
const{ loginRateLimiterMiddleware } = include('routes/helpers/')
const express = require("express");
const path = require("path");
const bodyparser = require("body-parser");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const multer = require("multer");
const upload = multer({ dest: "./tmp" });
const fs = require("fs");
const helmet = require("helmet");
const { xss } = require('express-xss-sanitizer');

const app = express();
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": csp_links,
        "script-src": csp_links,
        "script-src-attr": ["'unsafe-inline'"],
        "style-src": csp_links,
        "connect-src": csp_links
      },
    },
    referrerPolicy: {
      policy: ["strict-origin-when-cross-origin","same-origin"],
    },
    xPoweredBy: false,
    strictTransportSecurity: {
      maxAge: 123456,
    },
  })
);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "same-origin");
  next();
});

app.set("view engine", "ejs");
app.set("trust proxy", true); // trust leftmost proxy
app.use(express.static(path.join(__dirname, "./public")));
app.use("/scripts", express.static(path.join(__dirname, "./node_modules")));
app.use("/config", express.static(path.join(__dirname, "./config")));
app.use(bodyparser.json({ limit: "50mb" }));
app.use(bodyparser.urlencoded({ limit: "50mb", extended: true }));
app.use(xss());

const cookie = {
  httpOnly: true, // THIS IS ACTUALLY DEFAULT
  secure: process.env.NODE_ENV === "production",
  maxAge: 1 * 1000 * 60 * 60 * 24 * 1, // DEFAULT TO 1 DAY. UPDATE TO 1 YEAR FOR TRUSTED DEVICES
  sameSite: "lax",
};

const sessionMiddleware = session({
  name: `${app_suite}-session`,
  // secret: 'acclabspadspass',
  secret: `${app_suite}-${app_suite_secret}-pass`,
  store: new pgSession({ pgPromise: DB.general }),
  resave: false,
  saveUninitialized: false,
  cookie,
});

app.use(sessionMiddleware);

function setAccessControlAllowOrigin(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}

const routes = require("./routes/");

// HEALTH-CHECK + INFO
let versionObj = null;

function getVersionString() {
  return new Promise((resolve) => {
    if (versionObj !== null) {
      resolve(versionObj);
      return;
    }
    fs.readFile("version.txt", (err, data) => {
      if (err) {
        versionObj = {
          name: "no version available",
          commit: "unknown",
          app: `${app_id}`,
        };
      } else {
        const lines = data.toString().split(/[\r\n]+/);
        versionObj = {
          name: lines[0] || "no version available",
          commit: lines[1] || "unknown",
          date: lines[2] || "unknown",
          app: `${app_id}`,
        };
      }
      resolve(versionObj);
    });
  });
}

app.get("/version/", (req, res) => {
  getVersionString()
    .then((vo) => res.send(vo))
    .catch((err) => {
      console.log(err);
      res.status(500).send({
        name: "error while reading version",
        commit: "unknown",
        date: "unknown",
        app: `${app_id}`,
      });
    });
});

// PUBLIC VIEWS
app.get('/', routes.redirect.home, routes.dispatch.public)
app.get('/:language/home', routes.check.login, routes.dispatch.public)


app.route('/login') // TO DO: UPDATE FOR GET TO PASS LANGUAGE
	// .get(routes.redirect.home, routes.render.login)
	.get(routes.redirect.browse, routes.render.login)
	.post(loginRateLimiterMiddleware, routes.process.login)
app.get('/transfer', routes.process.login)
app.route('/logout/:session')
	.get(routes.process.logout)
	.post(routes.process.logout)

app.route('/reset/:token')
	.get(routes.redirect.browse, routes.render.login)

app.route('/forget-password')
	.get(routes.redirect.browse, routes.render.login)
	.post(routes.process.forgetPassword)

app.route('/reset-password')
	.get(routes.redirect.browse, routes.render.login)
	.post(routes.process.updatePassword)

app.route('/confirm-device')
	.get(routes.render.login)
	.post(routes.process.confirmDevice)

app.route('/resend-otp-code')
	.get(routes.process.resendCode)

app.route('/remove-trusted-device')
.post(routes.process.removeDevice)

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

app.get('/:language/analyse/:object', routes.check.login, routes.dispatch.analyse) // TO DO

app.get('/:language/exploration-info', routes.check.login, routes.render.explorationInfo)

app.post('/check/:object', routes.check.login, routes.process.check)

app.post('/save/:object', routes.check.login, routes.process.save)
app.post('/pin', routes.check.login, routes.process.pin)
app.post('/engage', routes.check.login, routes.process.engage)
app.post('/comment', routes.check.login, routes.process.comment)
app.post('/pagestats', routes.check.login, routes.process.pagestats)
app.post('/validate', routes.check.login, routes.process.validate) // THIS DOES NOT SEEM USED

app.put(
  "/exploration/create",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsentCheck,
  routes.process.explorationCreate
);
app.get(
  "/exploration/list",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsentCheck,
  routes.process.explorationList
);
app.put(
  "/exploration/doc",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsentCheck,
  routes.process.explorationDoc
);
app.get(
  "/exploration/collection",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsentCheck,
  routes.process.explorationCollection
);
app.get(
  "/exploration/consent",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsent
);
app.put(
  "/exploration/consent",
  routes.check.login,
  routes.process.explorationLoginCheck,
  routes.process.explorationConsent
);

app
  .route("/publish/:object")
  .get(routes.check.login, routes.process.publish)
  .post(routes.check.login, routes.process.publish);
app.get("/unpublish/:object", routes.check.login, routes.process.unpublish);
app.post("/share/:object", routes.check.login, routes.process.share);
app.get("/forward/:object", routes.check.login, routes.process.forward);
app.get("/delete/:object", routes.check.login, routes.process.delete);

app.post("/download/:object", routes.check.login, routes.process.download);

app
  .route("/request/:object")
  .get(routes.check.login, routes.process.request)
  .post(routes.check.login, routes.process.request);
app.get("/accept/:object", routes.check.login, routes.process.accept);
app.get("/decline/:object", routes.check.login, routes.process.decline);

// app.post('/deploy', routes.process.deploy)
// app.get('/demobilize', routes.process.demobilize)

// app.post('/intercept/:method', routes.process.intercept)

app.post("/call/api", routes.process.callapi); // TO DO: CHECK WHAT THIS IS FOR

app.post("/upload/img", upload.array("img"), routes.check.login, routes.process.upload);
app.post("/upload/video", upload.array("video"), routes.check.login, routes.process.upload);
app.post("/upload/pdf", upload.array("pdf"), routes.check.login, routes.process.upload);
app.post("/upload/xlsx", routes.check.login, routes.process.import); // TO DO: CHANGE path SCHEMA

app.post("/screenshot", routes.process.screenshot);

// TO DO: UPDATE SCHEMA BELOW
// app.post('/storeImport', routes.check.login, routes.process.import) // TO DO: CHANGE path SCHEMA
app.post("/forwardGeocoding", routes.check.login, routes.forwardGeocoding); // UPDATE TO geocode/forward
app.post("/reverseGeocoding", routes.check.login, routes.reverseGeocoding); // UPDATE TO geocode/forward

// API
app
  .route("/apis/:action/:object")
  .get(routes.check.login, setAccessControlAllowOrigin, routes.dispatch.apis)
  .post(routes.check.login, setAccessControlAllowOrigin, routes.dispatch.apis);

app.get("/api/skills", routes.check.login, routes.api.skills); // TO DO: THIS SHOULD BE DEPRECATED
app.get("/api/methods", routes.check.login, routes.api.methods); // TO DO: THIS SHOULD BE DEPRECATED
app
  .route("/api/datasources") // TO DO: THIS SHOULD BE DEPRECATED
  .get(routes.check.login, routes.api.datasources)
  .post(routes.check.login, routes.api.datasources);

// INSTANCES
app
  .route("/:language/:instance")
  .get(routes.check.login, routes.dispatch.browse);

app.get("/module-error", routes.error);
app.get("*", routes.notfound);

app.use((err, req, res, next) => {
  res.status(500).redirect('/module-error')
})

// RUN THE SERVER
app.listen(process.env.PORT || 2000, _ => {
	console.log(`the app is running on port ${process.env.PORT || 2000}`)
	getVersionString().then(vo => {
		console.log('name', vo.name);
		console.log('commit', vo.commit);
		console.log('deployed', vo.date);
		console.log('app_id', app_id);
	}).catch(err => console.log(err));
})


// INITIATE ALL CRON JOBS
const cron = require("node-cron");
DB.conn
  .tx((t) => {
    return t
      .none(
        `
		UPDATE mobilizations
		SET status = status + 1
		WHERE (start_date <= NOW() AND status = 0)
			OR (end_date <= NOW() AND status = 1)
	;`
      )
      .then((_) => {
        return t
          .any(
            `
			SELECT id, start_date, end_date FROM mobilizations
			WHERE start_date >= NOW()
				OR end_date >= NOW()
		;`
          )
          .then((results) => {
            results.forEach((d) => {
              const now = new Date();
              const start_date = new Date(d.start_date);
              const end_date = new Date(d.end_date);

              let expected_status;
              let ref_date;

              if (start_date >= now) {
                console.log("mobilization has not started");
                expected_status = 1;
                ref_date = start_date;
              }
              if (end_date >= now) {
                console.log("mobilization has not ended");
                expected_status = 2;
                ref_date = end_date;
              }

              const min = ref_date.getMinutes();
              const hour = ref_date.getHours();
              const day = ref_date.getDate();
              const month = ref_date.getMonth() + 1;
              const year = ref_date.getFullYear();

              cron.schedule(`${min} ${hour} ${day} ${month} *`, function () {
                DB.conn
                  .none(
                    `
						UPDATE mobilizations
						SET status = $1
						WHERE id = $2
					;`,
                    [expected_status, d.id]
                  )
                  .catch((err) => console.log(err));
              });
            });
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  })
  .catch((err) => console.log(err));

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
