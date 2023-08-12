# Development Notes

## Requirements

Requirements above and beyond project requirements listed on main readme:

- Volta: https://docs.volta.sh/guide/getting-started (for [Testing Npx Locally](#testing-npx-locally))

Sorry if Volta conflicts with something on your system and you want to mess with this package.

I've just found that every JS toolchain manager sucks, especially nvm, and that Volta just sucks slightly less. `¯\_(ツ)_/¯`

## Updating

**Important** - don't update the `chalk` package past version 4.x. See the [Troubleshooting](#troubleshooting) section below for more info.

Update all packages:

- Get the list of things to update: `npx -y npm-check-updates@latest`
- Update packages: `npx -y npm-check-updates@latest -u`
- Put chalk back to latest 4.x version (4.1.2 at time of writing)

## Testing Changes

Don't forget to have `npm run watch` running in a terminal while making and testing changes, otherwise your changes will not be applied when you run it.

Get the dotnet-react-sandbox repo once and then pull from local files to make repeated tests go faster:

- `npm run cloneRepoIntoTempDir`
- Change ProjectGenerator var `useLocalFilesInsteadOfCloning` to true
- `npm run example`
- Between runs, cleanup example with `npm run cleanupExample`, which:
    - Deletes `example-project` directory
    - Removes the example-project host entry
    - Uninstalls the example-project cert

Important:

- Don't forget to change `useLocalFilesInsteadOfCloning` back to false before committing.


## Testing Npx Locally

It's handy to be able to test it using `npx` without publishing first. It's a mystery I haven't figure out yet, but I've gotten different results between running locally and running the published npm package with npm. Running it this way will help us have higher confidence that it'll work with npx.

When incrementing package.json version for testing npm locally, you'll want to not increment the major/minor/patch version a bunch of times so there's holes in what get's published. Instead, increment to the version you want to publish next, but add a suffix like `-alpha.1`, `-alpha.2`, so it would be something `0.0.17-alpha.2`.

Steps:

- Increment package.json if you haven't already - use a strategy like 0.0.17-alpha.1, 0.0.17-alpha.2
- `npm run installPackedGlobal`
- Test in any directory (like `C:\temp\`) using `dotnet-react-generator` (example: `dotnet-react-generator -o acme -u acme.com -d acme`)
- After satisfied, run `npm run uninstallPackedGlobal`

What `npm run installPackedGlobal` does:

- Clean ./dist
- Build (use tsc to regenerate ./dist)
- Npm pack (including ensuring the new tarball gets moved to the `packed` directory and it's the only one there)
- Make sure `dotnet-react-generator` isn't already installed globally by uninstalling it (with the volta executable sind normal npm uninstall on a global package doesn't work when volta is installed unfortunately)
- Uses `npm install -g <tarball-path>` to install the packed package globally (note that it won't show up with `npm ls -g` because of volta, but `volta list` should show it at this point)

And `npm run uninstallGlobal` of course just uninstalls the global package (using both volta and npm in case we accidentally installed it with the wrong thing).


## Build and Publish

Important: don't forget to bump the version number in package.json before publishing. Also, committing to github first is recommended so that automatic pulling of the readme from the repo matches the version that's in npm.

Build just empties out the ./dist directory and runs `tsc` which regenerates the javascript files there along with their type declaration files (`*.d.ts`) and javascript/typescript source maps (`*.js.map` and `*.d.ts.map`).

Publish runs the `build` gulp command and then literally just calls `npm publish` - nothing special happening.

What gets published is defined in `.npmignore`. It essentially just ignores everything, then whitelists `./dist/src/*`.

You can verify what will be published by running `npm run pack`. Also see the [Testing Npx Locally](#testing-npx-locally) section above.

## TODO

- Audit openssl usage - may need to enforce a particular version instead of just checking for it's existence (openssl version must support `-addext` option, which I think was introduced in v3)
- Unit tests

## Unit Tests

There are package.json commands setup for `test` and `test:coverage`, which are wired up, but there are currently no unit tests... There are aspects of this project that would be hard to test, but not all - this is a good future improvement that can be made.

Perhaps in addition to adding unit tests, it would be nice to have a more formal and explicit integration test where it actually sets up a site, ensures it can run the additional commands (ensure the ports needed for the site and DB running in docker aren't being used), and then run those commands and hit the site to verify it works and the cert is trusted. There would be some restraints here besides the ports being available - would probably only support windows.

## Long Term Future Ideas

Explore other existing generators like yeoman (seems kind of stale), npm project templates or others. I very much doubt that these will have capability to modify hosts or create/install certificates, but we could combine/wrap the clone/template replacement functionality of an existing generator with our custom commands to do the more gritty stuff that requires admin rights on the machine.

The ability to not only generate a new site from the existing state of a repo, but update an existing site would be really cool. Would have to adopt some patterns like create-react-app where config that is able to be changed is isolated (and not in common files like package.json/gulpfile.js etc) and if you have the option to use the tool to update or "eject" so you can no longer get updates for have full control of the previously-controlled and updatable config. This is pretty low priority though - the main point of the generator and the sandbox project are to a) document what decent dotnet react app local development can look like (the Microsoft react template is maybe the dumbest thing ever created with that idiotic spa proxy garbage) and b) make it fast to get a new project off the ground. Giving the ability to allow anyone to incrementally update their project based on any little change in the dotnet-react-sandbox project might just be too much to ask. But perhaps some small subset of things might be updatable like commands in gulpfile, especially those that are just wrappers for methods from my node-cli-utils lib.

It would be nice to have better linux and mac support for the certificate portion. I chickened out on trying to figure out how to automate the mac stuff because a) it's drastically different between different versions of mac (I only have the one and don't think switching between 2 major versions to test is feasible) and b) the new mac OS is ultra strict and I feel like no matter what workaround scripting I could come up with to get the job done would get blocked out from under me. However, better linux support might be possible as long as we make some assumptions about what the setup is (Ubuntu with Chrome that is installed a particular way, for example).

Tighter integration with the dotnet-react-sandbox app. I created this generator with the idea that maybe I'd make it generate variations of projects: with and without database, different database options, using typescript vs not, using vite vs create-react-app for the client app, specifying different versions of .net, etc. It's not off the table, but right now I'd like to just focus on "the setup I happen to think is currently the best". The specific way that vite and dotnet work together with vite's proxy settings is just too good to try and glue together some other option at the moment, so I'm sticking with it until something better comes along.

I would like to remove gulp and never use it again. It has all these little gotchas and doesn't actually provide that much and has lots of security warnings, and out of all the nifty little bells and whistles it has, I use almost none of them. Even copying files around is significantly simpler just using `fs`. The whole point of gulp for me was to have an easy standardized way of creating project glue commands referenced as package.json commands and have nice composability of commands (series, parallel). But obviously JS is single threaded... so the whole series/parallel thing is pretty dumb. I think I'd rather do one of the following: 1) create my own npm package that just has the series/parallel composability methods and some other misc utility methods or 2) if I'm really concerned about performance and would like to for example build a client and server app at the same time (or any truly parallelizable commands), then I would just not use javascript (perhaps a dotnet CLI tool would work well).

## Troubleshooting

### Chalk and ESM

The author of the `chalk` npm module switched to pure ESM which is incredibly difficult to get working with a typescript node project without work (more than is advertized, as I found out the hard way). I'm not the only one in this boat. At the time of writing (2023-08-11) in the last 7 days there have been 144,316,827 downloads of version 4.1.2 (159,715,603 for all 4.x versions) and 10,507,609 downloads of 7 different releases of version 5.x combined. 92 of downloads are using the non-esm 4.x version. It's really unfortunate that folks decided to take pure ESM that was kinda good-ish for the browser (arguable) and horrible for node and nonsensical for typescript and pushed it as being the best way forward. It's even more unfortunate that random npm authors decided to make their libraries pure ESM "because it's the future" and ignore the lack of a clear upgrade path and backwards compatibility, breaking the projects of all consumers of their library for seemingly religious reasons. You can use commonjs from ESM but you can't call an ESM module from commonjs without workarounds.

If you get an error like this, it means you updated `chalk` to the pure ESM version and you'll need to downgrade to a 4.x version (see the [Updating](#updating) section above):

```
const chalk_1 = __importDefault(require("chalk"));
Error [ERR_REQUIRE_ESM]: require() of ES Module 
```
