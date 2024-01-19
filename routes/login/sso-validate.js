const msal = require('@azure/msal-node');
const { datastructures } = include('routes/helpers/');
const { app_languages, modules, msalConfig, DB, app_base_host, sso_redirect_url } =
  include('config/');
const { deviceInfo } = require('./device-info');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = (req, res, next) => {
  const tokenRequest = {
    code: req.query.code,
    redirectUri: sso_redirect_url,
    scopes: ['user.read'],
  };

  const device = deviceInfo(req);
  const { sessionID: sid } = req || {};

  //NEW USER DEFAULT VALUES
  const rights = 1;
  const iso3 = 'USA';
  const password = crypto.randomBytes(16).toString('hex');
  const position = '';
  const deviceGUID1 = __ucd_app || uuidv4();
  const deviceGUID2 = __puid || uuidv4();
  const deviceGUID3 = __cduid || uuidv4();

  msalClient
    .acquireTokenByCode(tokenRequest)
    .then((response) => {
      // Handle successful authentication
      const { username : email, name } = response.account;
      //TODO: INSPECT RESPONSE DATA FROM UNDP GRAPHAPI FOR INFO ABOUT USER'S BEREAU, COUNTRY AND JOB TITLE.

      DB.general.tx((t) => {
        // Check if user already exists, otherwise create new record for user
        return t
          .oneOrNone(
            `
                INSERT INTO users (email, name, rights, position, password, iso3, created_from_sso) 
                VALUES ($1, $2, $3, $4, crypt($5, GEN_SALT('bf', 8)), $6, $7) 
                ON CONFLICT (email)
                DO UPDATE SET name = EXCLUDED.name
            ;`,
            [email, name, rights, position, password, iso3, true],
          )
          .then((uname_result) => {
            // GET USER INFO, UPDATE SESSION AND TRUSTED DEVICE INFO
            return t
              .oneOrNone(
                `
                        SELECT u.uuid, u.rights, u.name, u.email, u.iso3,
                        COALESCE (su.undp_bureau, adm0.undp_bureau) AS bureau,
        
                        CASE WHEN u.language IN ($1:csv)
                            THEN u.language
                            ELSE 'en'
                        END AS language,
        
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
        
                        LEFT JOIN adm0_subunits su
                            ON su.su_a3 = u.iso3
                        LEFT JOIN adm0
                            ON adm0.adm0_a3 = u.iso3
        
                        WHERE (u.name = $2 OR u.email = $2)
                    ;`,
                [app_languages, email],
              )
              .then(async (results) => {
                if (!results) {
                  res.redirect('/login');
                } else {
                  const { language, rights, uuid } = results;

                  let redirecturl;
                  const { read, write } = modules.find(
                    (d) => d.type === 'pads',
                  )?.rights;
                  if (rights >= (write ?? Infinity))
                    redirecturl = `/${language}/browse/pads/private`;
                  else if (rights >= (read ?? Infinity))
                    redirecturl = `/${language}/browse/pads/shared`;
                  else redirecturl = `/${language}/browse/pads/public`;

                  return t
                    .none(
                      `
                                INSERT INTO trusted_devices (user_uuid, device_name, device_os, device_browser, last_login, session_sid, duuid1, duuid2, duuid3, is_trusted)
                                VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, true)
                                ON CONFLICT (user_uuid, device_os, device_browser, session_sid, duuid1, duuid2, duuid3 )
                                DO UPDATE SET last_login = EXCLUDED.last_login`,
                      [
                        uuid,
                        device.device,
                        device.os,
                        device.browser,
                        sid,
                        deviceGUID1,
                        deviceGUID2,
                        deviceGUID3,
                      ],
                    )
                    .then(() => {
                      const sessionExpiration = new Date(
                        Date.now() + 365 * 24 * 60 * 60 * 1000,
                      ); // 1 year from now
                      req.session.domain = app_base_host;
                      req.session.cookie.expires = sessionExpiration;
                      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

                      const sess = {
                        ...results,
                        is_trusted: true,
                        device: { ...device, is_trusted: true },
                      };
                      Object.assign(
                        req.session,
                        datastructures.sessiondata(sess),
                      );

                      res.cookie('__ucd_app', deviceGUID1, {
                        expires: sessionExpiration,
                        domain: app_base_host,
                      });
                      res.cookie('__puid', deviceGUID2, {
                        expires: sessionExpiration,
                        domain: app_base_host,
                      });
                      res.cookie('__cduid', deviceGUID3, {
                        expires: sessionExpiration,
                        domain: app_base_host,
                      });

                      res.redirect(redirecturl);
                    })
                    .catch(async (err) => {
                      console.log(err);
                      await Object.assign(
                        req.session,
                        datastructures.sessiondata(results),
                      );
                      return res.redirect(redirecturl);
                    });
                }
              })
              .catch((error) => {
                console.log(error);
              });
          })
          .catch((error) => {
            console.log(error);
          });
      });
    })
    .catch((error) => {
      // Handle authentication failure
      console.log(error);
      res.redirect('/login');
    });
};
