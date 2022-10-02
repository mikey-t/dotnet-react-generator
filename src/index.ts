#!/usr/bin/env node

import {Command, Option, OptionValues} from 'commander'
import 'source-map-support/register'
import ProjectGenerator from './ProjectGenerator'
import DependencyChecker from './DependencyChecker'
import chalk from 'chalk'

const version = '0.0.11'
const {performance} = require('perf_hooks')

const program = new Command()
const cwd = process.cwd()
const startTime = performance.now()

const cleanupCalled = process.argv.includes('--cleanup-example-project')
const depsCalled = process.argv.includes('--deps')
const overrideOptionCalled = cleanupCalled || depsCalled

let opts: OptionValues
if (!overrideOptionCalled) {
  program
    .name('dotnet-react-generator')
    .version(version, '-v, --version', 'output current version')
    .description('Generate a dotnet react project based on the repo https://github.com/mikey-t/dotnet-react-generator.\n\nExample: npx -y dotnet-react-generator -o acme -u acme.com -d acme')
    .requiredOption('-o, --output <string>', 'relative or absolute path for project output - last path segment will be used for project name, .net solution name and docker project name')
    .requiredOption('-u, --url <string>', 'production url for project ("local." will be prepended automatically for local development)')
    .requiredOption('-d, --db-name <string>', 'database name using lower_snake_case (this will also be used for the database username)')
    .addOption(new Option('-t, --project-type [project-type]').choices(['full', 'no-db', 'static']).default('full'))
    .option('--overwrite', 'overwrite directory if it already exists')
    .showHelpAfterError()
    .parse()

  opts = program.opts()
}

if (!overrideOptionCalled && opts!.projectType !== 'full') {
  throw Error('only the projectType "full" is currently supported')
}

main().finally(() => {
  const endTime = performance.now()
  const duration = Math.floor(endTime - startTime)
  console.log(chalk.blueBright('----------------------------------------------------'))
  console.log(`dotnet-react-generator finished in ${duration}ms\n`)
})

async function main() {
  console.log('starting dotnet-react-generator...')
  console.log(chalk.blueBright('----------------------------------------------------'))

  if (cleanupCalled) {
    await ProjectGenerator.cleanupExampleProject(cwd)
    return
  } else if (depsCalled) {
    console.log(chalk.green('>>> checking dependencies'))
    const depsChecker = new DependencyChecker()
    const report = await depsChecker.checkAllForDotnetReactSandbox()
    console.log(depsChecker.getFormattedReport(report))
    const depsCheckPassed = depsChecker.hasAllDependencies(report)
    console.log(`Dependencies check passed: ${depsCheckPassed ? chalk.green('true') : chalk.red('false')}`,)
    return
  }

  const generator = new ProjectGenerator(opts, cwd)
  generator.printArgs()
  await generator.generateProject()
}
