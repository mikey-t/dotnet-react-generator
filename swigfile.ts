import { series } from 'swig-cli'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import * as nodeCliUtils from '@mikeyt23/node-cli-utils'

const tsxArgs = ['--no-warnings', '--loader', 'tsx']
const tsxIndexArgs = [...tsxArgs, 'src/index.ts']
const testFiles = ['./test/ProjectGenerator.test.ts']

export const build = series(cleanDist, doBuild)
export const pack = series(cleanDist, doBuild, doPack)
export const buildAndPublish = series(cleanDist, doBuild, printMessageIfReadyToPublish)

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

export async function runExample() {
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

async function printMessageIfReadyToPublish() {
  const generatorFile = './src/ProjectGenerator.ts'
  const generatorFileContents = await fsp.readFile(generatorFile, 'utf8')
  if (generatorFileContents.includes('useLocalFilesInsteadOfCloning = true')) {
    throw new Error('./src/ProjectGenerator.ts has useLocalFilesInsteadOfCloning set to true - will not publish')
  } else {
    console.log(`✨ no temp code - ready to publish ✨ (run 'npm publish')`)
  }
}
