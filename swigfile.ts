import { series } from 'swig-cli'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import * as nodeCliUtils from '@mikeyt23/node-cli-utils'

const eslintPath = './node_modules/eslint/bin/eslint.js'
const tsxArgs = ['--no-warnings', '--loader', 'tsx']
const tsxIndexArgs = [...tsxArgs, 'src/index.ts']
const testFiles = ['./test/ProjectGenerator.test.ts']

export async function lint() {
  await nodeCliUtils.spawnAsync('node', [eslintPath, '--ext', '.ts', './src', './test'], { throwOnNonZero: true })
}

export const build = series(cleanDist, doBuild)
export const watch = series(cleanDist, doWatch)
export const pack = series(cleanDist, doBuild, doPack)

export async function cleanDist() {
  await nodeCliUtils.emptyDirectory('./dist')
}

export async function cloneSandboxIntoTemp() {
  const outputDir = 'git-repo-temp'
  await nodeCliUtils.emptyDirectory(outputDir)
  const cloneArgs = `clone -b main --single-branch --depth 1 git@github.com:mikey-t/dotnet-react-sandbox.git ${outputDir}`.split(' ')
  await nodeCliUtils.spawnAsync('git', cloneArgs)
}

export async function cleanPackedTest() {
  const toDelete = ['packed-test/node_modules', 'packed-test/package-lock.json', 'packed-test/generator-test']
  toDelete.forEach(async x => {
    if (fs.existsSync(x)) {
      await fsp.rm(x, { recursive: true })
    }
  })
}

export async function genExample() {
  const args = [...tsxIndexArgs, '--output=example-project', '--url=example.mikeyt.net', '--db-name=example_mikeyt', '--overwrite']
  await nodeCliUtils.spawnAsync('node', args)
}

export async function test() {
  if ((await nodeCliUtils.spawnAsync('node', [...tsxArgs, '--test', ...testFiles])).code !== 0) {
    throw new Error('Tests failed')
  }
}

export async function testWatch() {
  const args = [...tsxArgs, '--test', '--watch', ...testFiles]
  if ((await nodeCliUtils.spawnAsyncLongRunning('node', args)).code !== 0) {
    throw new Error('Tests failed')
  }
}

export async function testOnly() {
  const args = [...tsxArgs, '--test-only', '--test', ...testFiles]
  if ((await nodeCliUtils.spawnAsync('node', args)).code !== 0) {
    throw new Error('Tests failed')
  }
}

export async function testOnlyWatch() {
  const args = [...tsxArgs, '--test-only', '--test', '--watch', ...testFiles]
  if ((await nodeCliUtils.spawnAsyncLongRunning('node', args)).code !== 0) {
    throw new Error('Tests failed')
  }
}

// ******************************

async function doBuild() {
  await nodeCliUtils.spawnAsync('node', ['./node_modules/typescript/lib/tsc.js', '--p', 'tsconfig.build.json'])
}

async function doWatch() {
  await nodeCliUtils.spawnAsyncLongRunning('node', ['./node_modules/typescript/lib/tsc.js', '--p', 'tsconfig.build.json', '--watch'])
}

async function doPack() {
  const packedDir = './packed'
  if (fs.existsSync(packedDir)) {
    await fsp.rm(packedDir, { recursive: true })
  }
  await nodeCliUtils.mkdirp(packedDir)

  await nodeCliUtils.spawnAsync('npm', ['pack'])

  const dirEntries = await fsp.readdir('./')
  const tarballs = dirEntries.filter(e => e.endsWith('.tgz'))
  console.log('tarballs: ', tarballs)

  if (tarballs.length === 0) {
    throw new Error('no tarball was created - cannot move to packed dir')
  }

  if (tarballs.length > 1) {
    throw new Error('multiple packed modules - delete them all and re-run')
  }

  console.log('moving tarball to packed dir')
  await fsp.rename(tarballs[0], path.join('packed', tarballs[0]))
}
