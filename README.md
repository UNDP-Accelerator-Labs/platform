=======

# AccLab Platform

The live platforms can be accessed via:

https://acclabs-experiments.azurewebsites.net/

https://acclabs-solutionsmapping.azurewebsites.net/

https://acclabs-actionlearningplans.azurewebsites.net/

This is a Node.js application that uses Express.js for routing and EJS as the view engine. It interacts with two Postgres databases, where one stores shared information like user sessions and credentials, and the other stores information on pads.

## Local Setup

## Getting started

To set up the code locally, follow these steps:

1. Clone the repository.
2. Make sure that all required postgres extensions are installed on your DB.
3. Create the two required databases with your preferred names. Note the names and use them accordingly in your environment file.
4. Run the sql files against the postgres databases.
5. Make sure you have Node.js installed. Use the `node --version` command to check your version.
6. Install the required dependencies using either `npm install` or `yarn install`.
7. Initialize the `init.sql` file or create your database from a dump file if available. Note if you are starting from scratch (i.e., you are not using a dump file), then you will need to create the geo-referencing (`adm0` and `adm0_subunits`) tables separately. For this, please refer to the **Add geo-referencing system** section below.
8. Copy `template.env` to `.env` and set the environment variables and the appropriate credentials.
   (If the env file is other than `.env` you can specify the path via
   `ENV=<pathtoenv> make <command>` on all make commands)
9. Update the configuration in `config/edit/local.js` if needed.

## Add geo-referencing system

Note: only do this if you are starting from scratch (i.e., you are not using a `.sql` dump file to set up the app).

Requirements:
- make sure to initialize your database using the `init.sql` file
- make sure you have [ogr2ogr](https://gdal.org/programs/ogr2ogr.html) installed

Get the geo-data:
- go to [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/) and download the countries (**Download countries**) from the **Admin 0 - Countries** section, as well as the subunits (**Download map subunits**) from the **Admin 0 - Details** section
- unzip the downloaded files

Run the following command for the two `.shp` (shape)file in the unzipped folders:
- in `ne_10m_admin_0_countries/`:
`ogr2ogr -f "PostgreSQL" PG:"dbname='{your_db_name}' host='{your_host}' port='{your_port}' user='{your_psql_username}' password='{your_psql_password}'" ne_10m_admin_0_countries.shp -nln adm0 -nlt PROMOTE_TO_MULTI -s_srs EPSG:4326 -t_srs EPSG:4326`
- in `ne_10m_admin_0_map_subunits/`:
`ogr2ogr -f "PostgreSQL" PG:"dbname='{your_db_name}' host='{your_host}' port='{your_port}' user='{your_psql_username}' password='{your_psql_password}'" ne_10m_admin_0_map_subunits.shp -nln adm0_subunits -nlt PROMOTE_TO_MULTI -s_srs EPSG:4326 -t_srs EPSG:4326`

Assuming you extracted both zips into the same base folder and you have a `.env` run:

```sh
source path/to/.env
pushd ne_10m_admin_0_countries/
ogr2ogr -f "PostgreSQL" PG:"dbname='${LOGIN_DB_NAME}' host='${LOGIN_DB_HOST}' port='${LOGIN_DB_PORT}' user='${LOGIN_DB_USERNAME}' password='${LOGIN_DB_PASSWORD}'" ne_10m_admin_0_countries.shp -nln adm0 -nlt PROMOTE_TO_MULTI -s_srs EPSG:4326 -t_srs EPSG:4326
popd
pushd ne_10m_admin_0_map_subunits/
ogr2ogr -f "PostgreSQL" PG:"dbname='${LOGIN_DB_NAME}' host='${LOGIN_DB_HOST}' port='${LOGIN_DB_PORT}' user='${LOGIN_DB_USERNAME}' password='${LOGIN_DB_PASSWORD}'" ne_10m_admin_0_map_subunits.shp -nln adm0_subunits -nlt PROMOTE_TO_MULTI -s_srs EPSG:4326 -t_srs EPSG:4326
popd
```

Finally, run:
`node routes/scripts/shared/store_adm0_location.js` or better

```
make script ENV=.ap.env CMD=store_adm0_location.js
make script ENV=.exp.env CMD=store_adm0_location.js
make script ENV=.sm.env CMD=store_adm0_location.js
make script ENV=.global.env CMD=store_adm0_location.js
```

This will add a couple of columns to the two tables with information on UNDP regional bureaux.

For more information on using `ogr2ogr` to convert shapefiles to postgis, please refer to [this resource](https://mapscaping.com/loading-spatial-data-into-postgis/#:~:text=One%20common%20way%20to%20load,table%20in%20a%20PostgreSQL%20database.)


## Run the servers

Run:

```
source .env
npm start
```

or

```
make run-web
```

And in another tab (to compile sass):

```
npm run sass
```

Open your browser and navigate to [http://localhost:2000](http://localhost:2000) to access the application.

## Add User

Run:

```
make create-user
```

To interactively insert a user into the login db.

## File Structure

The file structure of this project is organized as follows:

- **views**: Contains all front-end logic and views. The front-end heavily depends on the D3.js library and EJS templating.
- **public**: Contains all static files and styling.
- **routes**: Contains all routing, backend logic, and resource privileges.
- **config**: Contains platform configuration files.
  - **config/db**: Contains database settings.
  - **config/edit**: Contains platform configurable settings.

## Create docker image locally

Run

```
make -s build
```

to build the docker image.
Use `make -s git-check` to verify that the current working copy is clean and
that no unwanted (or uncommit) files will be included in the image.

## Push docker image

Make sure to log in to azure via `make azlogin`.

Run

```
make -s build
make -s dockerpush
```

to build the image and push it to azure. Make sure to update the image in the
Deployment Center. This is only if you need to test non major version changes.
For proper deployment use the deploy functionality as described below.

## Deploying new version to staging

Make sure to be on the master branch with a clean working copy.

Run

```
make -s publish
```

## Updating to use ltree

For updating tables to use ltree (if you didn't run `init.sql` from scratch)
run:

```
make -s script ENV=<yourenv> CMD=setup_versions.js TABLE=pads ACTION=update
make -s script ENV=<yourenv> CMD=setup_versions.js TABLE=mobilizations ACTION=update
make -s script ENV=<yourenv> CMD=setup_versions.js TABLE=templates ACTION=update
```

## Updating to move pinboards

For moving the pinboards tables (if you didn't run `init.sql` from scratch)
run:

```
make script ENV=.ap.env CMD=transfer_pinboards.js ACTION=transfer
make script ENV=.exp.env CMD=transfer_pinboards.js ACTION=transfer
make script ENV=.sm.env CMD=transfer_pinboards.js ACTION=transfer
make script ENV=.global.env CMD=transfer_pinboards.js ACTION=transfer
```

Where the env files contain the connections to the respective dbs.
At this point the changes are still reversible via:

```
make script ENV=.ap.env CMD=transfer_pinboards.js ACTION=rollback
make script ENV=.exp.env CMD=transfer_pinboards.js ACTION=rollback
make script ENV=.sm.env CMD=transfer_pinboards.js ACTION=rollback
make script ENV=.global.env CMD=transfer_pinboards.js ACTION=rollback
```

Manually check for duplicate `owner, title` pairs in the `pinboards` table
and ensure to solve those conflicts. Then recreate the `unique_pinboard_owner`
constraint using the version in `init.sql`. You can find those duplicates via:

```
SELECT t.owner, t.title, t.count FROM (
    SELECT owner, title, COUNT(*) count FROM pinboards GROUP BY owner, title
) as t WHERE t.count > 1
```

Once the duplicates are dealt with (e.g., by renaming) run:

```
ALTER TABLE pinboards DROP CONSTRAINT IF EXISTS unique_pinboard_owner;
ALTER TABLE pinboards ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner);
```

To finalize the changes and making it irreversible run:

```
make script ENV=.ap.env CMD=transfer_pinboards.js ACTION=finish
make script ENV=.exp.env CMD=transfer_pinboards.js ACTION=finish
make script ENV=.sm.env CMD=transfer_pinboards.js ACTION=finish
make script ENV=.global.env CMD=transfer_pinboards.js ACTION=finish
```
