# Dev Notes for dotnet-react-generator

## Testing with Unit Tests

- Ensure fresh version of repo has been pulled down: `swig cloneSandboxIntoTemp`
- (optional) Set `.env` value for key `USE_LOCAL_INSTEAD_OF_CLONING`
- Run: `swig test`

## Testing With Live CLI

Setup:

- In generator dir:
    - Run: `npm link`
    - Run: `swig watch`
- In temp dir where you want to create a project (pass whatever options you're looking to test): `dotnet-react-generator -o delete-me -u example.com -d delete_me`
- Refer to dotnet-react-sandbox docs for remaining setup instructions
- When making changes, just run `swig build` and then re-run `dotnet-generator` command in temp dir

Cleanup:

- Terminate running watch command with `ctrl + c`
- In generator dir: `npm unlink`
- Delete any temp project's spun up during testing

## Build and Publish

- Bump version number in `package.json`
```
swig cloneSandboxIntoTemp
swig test
swig build
```
- Commit changes
```
npm publish
```
