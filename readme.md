# dotnet-react-generator

Node script to generate a new project based on the repo [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox).

Example (assuming you have a directory at `~/src`):

```Powershell
cd ~/src
npx -y dotnet-react-generator@latest -o acme -u acme.com -d acme
cd acme
npm run dockerUp
npm run dbInitialCreate
npm run bothDbMigrate
```

Then in 2 terminals:

`npm run server`

`npm run client`

Then navigate to https://local.acme.com.

## What It Does

- Clone [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox) into directory specified with `-o` option
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

For more info see [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-generator).

## Remove Generated Project

Manual steps to completely remove generated project:

- If you have run `npm run dockerUp`, then run `npm run dockerDown`
- Delete created directory
- Remove hosts entry
- Remove generated certificate

## NPX Gotchas

- Depending on what version of npm you have installed, if you have run the npx command before and there's a new version available, `npx` won't get the new version unless you explicitly add `@latest` (or specific version) to the command, or explicitly clear your npx cache. 
- If you run npx within an existing node project it will look in the project-local node_modules bin and won't find dotnet-react-generator. You must run it from a non-node project directory.

## Linux Support

This has only been test on Ubuntu 20.04 LTS. Other versions of Ubuntu and Debian will probably also work.

All generator steps should work on linux except certificate installation. Chrome on linux does not use system certificates so automating the install would require significant work. Instead, install the certificate manually (after you've run the generator) by doing the following:

- In Chrome, go to chrome://settings/certificates
- Select Authorities -> import
- Select your generated .crt file from ./cert/ (if you haven't generated it, use the opensslGenCert package.json/gulp task inside the generated project)
- Check box for "Trust certificate for identifying websites"
- Click OK
- Reload site

## TODO

- More documentation
- Linux support
- Mac support
- No database option that omits the docker/database/auth functionality
- Static site option (just a plain react site with no dotnet backend)
