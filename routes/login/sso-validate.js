const msal = require('@azure/msal-node');
const { datastructures } = include('routes/helpers/')
const { app_languages, modules, msalConfig, DB } = include('config/')
const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = (req, res, next) => {
    const { referer, host } = req.headers || {}
    const { originalUrl } = req.body;
    const { sso_redirect_url } = req.query || {}
    const { path } = req || {}

	const tokenRequest = {
		code: req.query.code,
		redirectUri: sso_redirect_url,
		scopes: ['user.read', 'User.ReadBasic.All'], // Adjust the scopes based on your requirements
	};

	msalClient.acquireTokenByCode(tokenRequest)
	.then((response) => {
		// Handle successful authentication
		// You can access the access token, user information, etc. from the response
        let email = response.account.username;
        let accessToken= response.accessToken;
        const { name } = response?.account?.idTokenClaims;

        const userInfoQuery = `
            SELECT u.uuid, u.rights, u.name, u.email, u.iso3, c.lng, c.lat, c.bureau,
            CASE WHEN u.language IN ($1:csv)
                THEN u.language
                ELSE 'en'
            END AS language,
            CASE WHEN u.language IN ($1:csv)
                THEN (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = u.language)
                ELSE (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = 'en')
            END AS countryname,
            COALESCE(
                (SELECT json_agg(DISTINCT(jsonb_build_object(
                    'uuid', u2.uuid,
                    'name', u2.name,
                    'rights', u2.rights
                ))) FROM team_members tm
                INNER JOIN teams t
                    ON t.id = tm.team
                INNER JOIN users u2
                    ON u2.uuid = tm.member
                WHERE t.id IN (SELECT team FROM team_members WHERE member = u.uuid)
            )::TEXT, '[]')::JSONB
            AS collaborators
            FROM users u
            INNER JOIN countries c
                ON u.iso3 = c.iso3
            WHERE (u.name = $2 OR u.email = $2)
        ;`

        // Check if user already exists in the database
        DB.general.tx(t => {
            // TEST USERNAME
            return t.oneOrNone(`
                SELECT * FROM users
                WHERE email = $1
            ;`, [ email ])
            .then(uname_result => {

                if (uname_result) {
                    // User already exists
                    // Authenticate the user and set up the session or token

                    // GET USER INFO
                    return t.oneOrNone(userInfoQuery, [ app_languages, email ])
                    .then(async results => {
                        if (!results) {
                            res.redirect('/login')
                        } else {
                            const { language, rights } = results;
                            results.accessToken = accessToken;
                            await Object.assign(req.session, datastructures.sessiondata(results))

                            if (!originalUrl || originalUrl === path) {
                                const { read, write } = modules.find(d => d.type === 'pads')?.rights;
                                if (rights >= (write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
                                else if (rights >= (read ?? Infinity)) res.redirect(`/${language}/browse/pads/shared`)
                                else res.redirect(`/${language}/browse/pads/public`)
                            } else res.redirect(originalUrl || referer)
                        }

                    })
                    .catch((error) => {
                        console.log(error);
                    });
                } else {
                    // New user, create a new record in the database
                    let rights = 1;
                    let iso3 = 'USA'; //default to usa
                    let password= " "
                    let position=''
                    let createdFromSso = true;
                    DB.general.tx(t => {
                        return t.one(`
                            INSERT INTO users (email, name, rights, position, password, iso3, createdFromSso) 
                            VALUES ($1, $2, $3, $4, crypt($5, GEN_SALT('bf', 8)), $6, $7) 
                            RETURNING *`,
                            [email, name, rights, position, password, iso3, createdFromSso]
                        )
                        .then(result => {
                            if (result) {
                                // GET USER INFO
                                return t.oneOrNone(userInfoQuery, [ app_languages, email ])
                                .then(async results => {

                                    if (!results) {
                                        res.redirect('/login')
                                    } else {
                                        const { language, rights } = results;
                                        results.accessToken = accessToken;
                                        await Object.assign(req.session, datastructures.sessiondata(results))

                                        if (!originalUrl || originalUrl === path) {
                                            const { read, write } = modules.find(d => d.type === 'pads')?.rights

                                            if (rights >= (write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
                                            else if (rights >= (read ?? Infinity)) res.redirect(`/${language}/browse/pads/shared`)
                                            else res.redirect(`/${language}/browse/pads/public`)
                                        } else res.redirect(originalUrl || referer)
                                    }

                                })
                                .catch((error) => {
                                    console.log(error);
                                });
                            }

                            return res.redirect('/login');
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                    })
                };
            })
            .catch((error) => {
                console.log(error);
            });
        })
	})
	.catch((error) => {
		// Handle authentication failure
		console.log(error);
		res.redirect('/login');
	});
}