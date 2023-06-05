# AccLab Platform

This is a Node.js application that uses Express.js for routing and EJS as the view engine. It interacts with two Postgres databases, where one stores shared information like user sessions and credentials, and the other stores information on pads.

## Branches and Deployment

There are different branches in this repository that trigger automatic deployment to the relevant Azure web app instances:

- **global_platform** branch deploys to the Global platform Azure web app instance: [acclabs-global.azurewebsites.net](https://acclabs-global.azurewebsites.net/)
- **experiments_platform** branch deploys to the Experiment platform Azure web app instance: [acclabs-global.azurewebsites.net/en/browse/pads/public](https://acclabs-global.azurewebsites.net/en/browse/pads/public)
- **solutions_mapping_platform** branch deploys to the Solution mapping platform Azure web app instance: [undphqexoacclabsapp01.azurewebsites.net](https://undphqexoacclabsapp01.azurewebsites.net/)
- **action_plans_platform** branch deploys to the Action plan Azure web app instance: [acclabs-actionplans.azurewebsites.net](https://acclabs-actionplans.azurewebsites.net/)

## Local Setup

To set up the code locally, follow these steps:

1. Clone the repository.
2. Make sure you have Node.js installed. Use the `node --version` command to check your version.
3. Install the required dependencies using either `npm install` or `yarn install`.
4. Install SASS globally using `npm install -g sass`. You will need it to build your SASS file.
5. Create the two required databases with your preferred names. Note the names and use them accordingly in your environment file.
6. Initialize the `init.sql` file or create your database from a dump file if available.
7. Create or update the `template.env` file for your environment variables. Set the appropriate values for the variables listed, including database connection details, API keys, SMTP credentials, and more.

```bash
export database=''
export port=''
export host=''
export user=''
export password='     '
export OPENCAGE_API=''
export ACCLAB_PLATFORM_KEY=''
export SMTPuser=''
export SMTPpassword=''
export GLOBAL_LOGIN_KEY=''
export APP_SUITE_SECRET=''
export APP_SECRET=''
export BACKDOORPW='' 
export LOGIN_DB_NAME=''
export LOGIN_DB_PORT=''
export LOGIN_DB_HOST=''
export LOGIN_DB_USERNAME=''
export LOGIN_DB_PASSWORD='     '
export LOGIN_DB_STRING=''

export BLOG_DB_HOST=""
export BLOG_DB_NAME=""
export BLOG_DB_PASSWORD=""
export BLOG_DB_USERNAME=""
```


8. Run `source template.env` to load all your environment variables.
9. Run `npm start` to start the application.
10. Open your browser and navigate to [http://localhost:3000](http://localhost:2000) to access the application.

## File Structure

The file structure of this project is organized as follows:

- **views**: Contains all front-end logic and views. The front-end heavily depends on the D3.js library and EJS templating.
- **public**: Contains all static files and styling.
- **routes**: Contains all routing, backend logic, and resource privileges.
- **config**: Contains platform configuration files.
  - **config/db**: Contains database settings.
  - **config/edit**: Contains platform configurable settings.

Feel free to modify this README file to include any additional information or instructions.
