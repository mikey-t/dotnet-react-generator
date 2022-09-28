# dotnet-react-generator

Node script to generate a new project based on the repo [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox).

Example:

`npx dotnet-react-generator  --project-name=example-project --url=example.mikeyt.net --db-name=example_mikeyt`

## What It Does

- Clone [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox) into directory with specified project name
- Update placeholders based on options passed (mostly in .env.template)
- Add hosts entry: `127.0.0.1 local.<specified url>`
- Npm install inside root of new project directory
- Sync .env files (sync .env.template to .env and copy to all relevant directories)
- Install or update dotnet ef tool (for database migrations)
- Generate self-signed SSL cert (for local use only)
- Install generated SSL cert into trusted store (for trusted local https)
- Npm install inside new project's client app directory (`<new project directory>/src/client`)

The "manual" steps required to complete setup after running the generator (from a terminal inside new project directory):

- Ensure you specified a DB port in the .env file that is not already in use
- `npm run dockerUp`
- Wait a few seconds to give the postgres docker container time to initialize the database instance
- `npm run dbInitialCreate`
- `npm run bothDbMigrate`

Then you can run the project by opening 2 terminals inside the new project and running one of these in each:

- `npm run server`
- `npm run client`

Then in a browser you can navigate to the running site at `https://local.<url you specified>`.

## TODO

- Help command
- Documentation
- Linux support
- Mac support
- Static site option that omits the docker/database/auth functionality
- Ability to specify arbitrary absolute path for directory output instead of basing it on current working directory
- Check that user has admin permissions before continuing
- Check that user has dependencies installed beforehand (git, .net >= 6, node >= 16, docker, openssl)

## Maybe TODO

- Option to generate react-only site (so we can get the benefit of setting up hosts/cert, package.json/gulpfile tasks, vite config, etc)
  - Create separate template repo to copy from
