#!/usr/bin/env node

import { Command, OptionValues } from 'commander'
import ProjectGenerator from './ProjectGenerator.js'
import path from 'path'
import fs from 'fs'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'url'
import { cyan, green } from '@mikeyt23/node-cli-utils/colors'
import { humanizeTime } from '@mikeyt23/node-cli-utils'

const dirname = fileURLToPath(import.meta.url)
const cwd = process.cwd()
const packageJsonPath = path.join(dirname, '../../package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

const program = new Command()
const startTime = performance.now()

const description = 'Description:\n  Generate a dotnet react project based on the repo https://github.com/mikey-t/dotnet-react-sandbox.'
const requiredParamsMessage = 'Required parameters:\n  --output, --url, --db-name\n  or\n  -o, -u -d'
const exampleMessage = 'Example using npx:\n  npx -y dotnet-react-generator -o acme -u acme.com -d acme'

program
  .name('dotnet-react-generator')
  .version(version, '-v, --version', 'Output current version of dotnet-react-generator.')
  .description(`${description}\n\n${requiredParamsMessage}\n\n${exampleMessage}`)
  .requiredOption('-o, --output <string>', 'The relative or absolute path for project output. The last path segment will be used for project name, dotnet solution name and docker project name. The project name must be less than 80 characters and contain only letters, numbers, underscores, dashes and periods.')
  .requiredOption('-u, --url <string>', 'Url for project. Do not include the protocol (e.g. "http://"). Example: "local.acme.com" (without quotes).')
  .requiredOption('-d, --db-name <string>', 'Postgres database name. Must use lower_snake_case. This value will also be used for the database username.')
  .option('--overwrite', 'Overwrite directory specified in the --output option if that directory already exists.')
  .showHelpAfterError()
  .parse()

const opts: OptionValues = program.opts()

const separator = cyan('----------------------------------------------------')

main().finally(() => {
  const endTime = performance.now()
  console.log(separator)
  const formattedDuration = green(humanizeTime(endTime - startTime))
  console.log(`dotnet-react-generator finished in ${formattedDuration}\n`)
})

async function main() {
  console.log('starting dotnet-react-generator...')
  console.log(separator)
  const generator = new ProjectGenerator(opts, cwd)
  generator.printArgs()
  await generator.generateProject()
}
