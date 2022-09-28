#!/usr/bin/env node

import 'source-map-support/register'
import ProjectGenerator from './ProjectGenerator'
import DependencyChecker from './DependencyChecker'
import chalk from 'chalk'

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const {performance} = require('perf_hooks')

const cwd = process.cwd()
const startTime = performance.now()

main().finally(() => {
  const endTime = performance.now()
  const duration = Math.floor(endTime - startTime)
  console.log(chalk.blueBright('----------------------------------------------------'))
  console.log(`dotnet-react-generator finished in ${duration}ms\n`)
})

async function main() {
  console.log('starting dotnet-react-generator...')
  console.log(chalk.blueBright('----------------------------------------------------'))

  if (argv['cleanup-example-project']) {
    await ProjectGenerator.cleanupExampleProject(cwd)
    return
  }

  if (argv['deps']) {
    console.log(chalk.green('>>> checking dependencies'))
    const depsChecker = new DependencyChecker()
    const report = await depsChecker.checkAllForDotnetReactSandbox()
    console.log(depsChecker.getFormattedReport(report))
    const depsCheckPassed = depsChecker.hasAllDependencies(report)
    console.log(`Dependencies check passed: ${depsCheckPassed ? chalk.green('true') : chalk.red('false')}`,)
    return
  }

  const generator = new ProjectGenerator(cwd, argv)
  await generator.generateProject()
}
