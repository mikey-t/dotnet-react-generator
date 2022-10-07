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
- (Linux/Mac) Install the generated self-signed certificate into your machine's trusted root store (see [Certificate Install](#certificate-install) below)

Then you can run the project by opening 2 terminals inside the new project and running one of these in each:

- `npm run server`
- `npm run client`

Then in a browser you can navigate to the running site at `https://local.<url you specified>`.

For more info see [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-generator).

## Certificate Install

### Linux Cert Install

Chrome on linux does not use the normal system certificates (the `ca-certificates` package won't affect chrome since chrome does not use /usr/local/share/ca-certificates). Although it's possible to install a few things and configure a Linux system so scripted cert install is possible, it's also pretty easy to just install it manually by following these steps:
- In Chrome, go to chrome://settings/certificates (or navigate there via settings -> Privacy and Security -> Advanced -> Manage Certificates)
- Select Authorities -> import
- Select your generated .crt file from ./cert/ (if you haven't generated it, see the opensslGenCert command)
- Check box that says "Trust certificate for identifying websites"
- Click OK

### MacOS Cert Install

One way to install a cert on newer macOS version is the following:

- Open your new project's `./cert` directory in finder
- Open the keychain and navigate to the certificates tab
- Select `System` certificates
- Back in the `./cert` directory, double-click the generated `.crt` file - this should install it in the system certificates keychain area
- After it's imported into system certificates you still have to tell it to trust the certificate (*eye roll*), which can be done by double-clicking the certificate in the keychain window, expanding the `Trust` section and changing the dropdown `When using this certificate:` to `Always Trust`

Another macOS certificate note: newer versions of macOS require that self-signed certificates contain ext data with domain/IP info, and yet the version of openssl installed by default (LibreSSL 2.8.3) does not support the `-addext` option (**bravo** Apple! - really, just - top notch work there). On top of this, newer versions of macOS prevent scripted installation of any certificate to the trusted store without also modifying system security policy files (different depending on what macOS version and for whatever reason root permission is not the only requirement - go figure).

### Windows Cert Install

No action required. If you ran this generator script then it was installed automatically for you with the powershell command `Import-PfxCertificate`. If you want to use this yourself for other certificates, you can import to the trusted store in a terminal with elevated permissions by running something like this:

`Import-PfxCertificate -FilePath <your_pfx_file_path> -CertStoreLocation Cert:\\LocalMachine\\Root`

Or if you didn't get the cert generated or installed for some reason but have the dotnet-react-sandbox app cloned, you can use these commands from the new project's root (after running npm install at least once):

Generate cert: `npm run opensslGenCert -- --url=local.your-site.com`

Install cert: `npm run winInstallCert -- --name=local.your-site.com.pfx`

## Remove Generated Project

Manual steps to completely remove generated project:

- If you have run `npm run dockerUp`, then run `npm run dockerDown`
- Delete created directory
- Remove hosts entry
- Remove generated certificate

## NPX Gotchas

- Depending on what version of npm you have installed, if you have run the npx command before and there's a new version available, `npx` won't get the new version unless you explicitly add `@latest` (or specific version) to the command, or explicitly clear your npx cache. 
- If you run npx within an existing node project it will look in the project-local node_modules bin and won't find dotnet-react-generator. You must run it from a non-node project directory.

## TODO

- More documentation
- No database option that omits the docker/database/auth functionality
- Static site option (just a plain react site with no dotnet backend)
