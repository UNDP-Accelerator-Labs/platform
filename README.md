=======
# AccLab Platform

This is a Node.js application that uses Express.js for routing and EJS as the view engine. It interacts with two Postgres databases, where one stores shared information like user sessions and credentials, and the other stores information on pads.

## Branches and Deployment

There are different branches in this repository that trigger automatic deployment to the relevant Azure web app instances:

- **global_platform** branch deploys to the Global platform Azure web app instance: [acclabs-global.azurewebsites.net](https://acclabs-global.azurewebsites.net/)
- **experiments_platform** branch deploys to the Experiment platform Azure web app instance: [acclabs-global.azurewebsites.net/en/browse/pads/public](https://acclabs-global.azurewebsites.net/en/browse/pads/public)
- **solutions_mapping_platform** branch deploys to the Solution mapping platform Azure web app instance: [undphqexoacclabsapp01.azurewebsites.net](https://undphqexoacclabsapp01.azurewebsites.net/)
- **action_plans_platform** branch deploys to the Action plan Azure web app instance: [acclabs-actionplans.azurewebsites.net](https://acclabs-actionplans.azurewebsites.net/)

The deployment actions are defined in the `.github/workflows` folder of each deployment branches.

## Local Setup

## Getting started

To set up the code locally, follow these steps:

1. Clone the repository.
2. Make sure that all required postgres extensions are installed on your DB.
3. Create the two required databases with your preferred names. Note the names and use them accordingly in your environment file.
4. Run the sql files against the postgres databases.
5. Make sure you have Node.js installed. Use the `node --version` command to check your version.
6. Install the required dependencies using either `npm install` or `yarn install`.
7. Initialize the `init.sql` file or create your database from a dump file if available.
8. Copy `template.env` to `.env` and set the environment variables and the appropriate credentials.
    (If the env file is other than `.env` you can specify the path via
    `ENV=<pathtoenv> make <command>` on all make commands)
9. Update the configuration in `config/edit/index.js` if needed.

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

## Updating to use ltree

For updating tables to use ltree (if you didn't run `init.sql` from scratch)
go to `routes/scripts` and run:

```
node setup_versions.js pads update
node setup_versions.js mobilizations update
node setup_versions.js templates update
```
