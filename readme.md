# dotnet-react-generator

This is a node script that can generate a new project based on the repo [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox).

The generated project works on Windows, Linux and Mac, but note that certificate setup has to be done manually on Linux and Mac (see docs for the dotnet-react-sandbox project for more info).

Running this script requires `NodeJS` >= 16 and `Git`.

If you want to finish the setup of the new project, you'll also need:
- Dotnet SDK 6
- Docker
- OpenSSL

## Example Usage

```bash
cd ~/src
npx -y dotnet-react-generator@latest -o acme -u acme.com -d acme
cd acme
npm run npmInstall

# In shell with elevated permissions
npx swig setup

# In 2 separate shells (elevated permissions not required):
npx swig server
npx swig client
```

Then navigate to https://local.acme.com.

Full setup instructions: [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox)

## What It Does

- Clones [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox) into directory specified with `-o` option
- Updates placeholders within files based on options passed
- Sets up a docker-compose for a postgres database named from your `-d` option

For more info see [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-generator).

## Remove Generated Project

If you didn't run additional setup commands after generating the project:

- Delete the created directory

If you ran additional setup commands like `npx swig setup` in an elevated shell:

- Run in an elevated shell: `npx swig teardown`

## NPX Gotchas

- Depending on what version of npm you have installed, if you have run the npx command before and there's a new version available, `npx` won't get the new version unless you explicitly add `@latest` (or specific version) to the command, or explicitly clear your npx cache.
- Sometimes even when using `@latest` npx still won't pull down a new version unless you also pass the `--ignore-existing` option.
- If you run npx within an existing node project it will look in the project-local node_modules bin and won't find dotnet-react-generator. You must run it from a non-node project directory.

## Development

See [./DevNotes.md](./DevNotes.md).
