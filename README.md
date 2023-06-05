# Pads

## Getting started

Make sure that all required postgres extensions are installed on your DB.
Run all the sql files on the postgres-DB.

Install using: `npm install`
Update the configuration in `config/edit/index.js` if needed.
Create a `.env` file from the `template.env` with the appropriate credentials.
(If the env file is other than `.env` you can specify the path via
`ENV=<pathtoenv> make <command>` on all make commands)

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

## Add User

Run:
```
make create-user
```
To interactively insert a user into the login db.
