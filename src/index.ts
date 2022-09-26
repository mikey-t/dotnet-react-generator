#!/usr/bin/env node

import 'source-map-support/register'
import ProjectGenerator from './ProjectGenerator'

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const {performance} = require('perf_hooks')

const cwd = process.cwd()

const startTime = performance.now()

main().finally(() => {
  const endTime = performance.now()
  const duration = Math.floor(endTime - startTime)
  console.log('---------------------')
  console.log(`generator finished in ${duration}ms\n`)
})

async function main() {
  console.log('****************************')
  console.log('**  Admin rights required **')
  console.log('****************************\n')

  console.log('starting generator...')
  console.log('---------------------')

  if (argv['cleanupExampleProject']) {
    await ProjectGenerator.cleanupExampleProject(cwd)
    return
  }

  const generator = new ProjectGenerator(cwd, argv)
  await generator.generateProject()
}
