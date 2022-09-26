# dotnet-react-generator

Node script to generate a new project based on the repo [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox).

Example:

`npx dotnet-react-generator  --project-name=example-project --url=example.mikeyt.net --db-name=example_mikeyt`

## TODO

- Help command
- Documentation
- Linux support
- Mac support
- Static site option that omits the docker/database/auth functionality
- Ability to specify arbitrary absolute path for directory output instead of basing it on current working directory
- Check that user has admin permissions before continuing
- Check that user has dependencies installed beforehand (.net >= 6, node >= 16, docker, openssl)
