#!/usr/bin/env node

import {Command, Option, OptionValues} from 'commander'
import 'source-map-support/register'
import ProjectGenerator from './ProjectGenerator'
import DependencyChecker from './DependencyChecker'
import chalk from 'chalk'

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const {performance} = require('perf_hooks')

const program = new Command()
const cwd = process.cwd()
const startTime = performance.now()

const cleanupCalled = !!argv['cleanup-example-project']
const depsCalled = !!argv['deps']

let opts: OptionValues
if (!cleanupCalled && !depsCalled) {
  program
    .version('0.0.6', '-v, -V, --version', 'output current version')
    .requiredOption('-o, --output <string>', 'relative or absolute path for project output - last path segment will be used for project name, .net solution name and docker project name')
    .requiredOption('-u, --url <string>', 'production url for project ("local." will be prepended automatically)')
    .requiredOption('-d, --db-name <string>', 'database name using lower_snake_case (this will also be used for the database username)')
    .addOption(new Option('-t, --project-type [project-type]').choices(['full', 'no-db', 'static']).default('full'))
    .option('--overwrite', 'overwrite directory if it already exists')
    // .showHelpAfterError('(add --help for additional information)')
    // .addHelpCommand(true)
    .showHelpAfterError()
    .parse()

  opts = program.opts()
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
