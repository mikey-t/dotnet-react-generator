const { series } = require('gulp')
const fs = require('fs-extra')
const fsp = require('fs').promises
const { waitForProcess, defaultSpawnOptions } = require('@mikeyt23/node-cli-utils')
const { spawn } = require('child_process')
const util = require('util')
const path = require('path')
const readdir = util.promisify(fs.readdir)
const which = require('which')

async function build() {
  await waitForProcess(spawn('tsc', [], defaultSpawnOptions))
}

async function watch() {
  await waitForProcess(spawn('tsc', ['--watch'], defaultSpawnOptions))
}

async function cleanDist() {
  await fs.emptyDir('./dist')
}

async function cloneSandboxRepoIntoTempDir() {
  const outputDir = 'git-repo-temp'
  await fs.emptyDir(outputDir)
  const cloneArgs = `clone -b main --single-branch --depth 1 git@github.com:mikey-t/dotnet-react-sandbox.git ${outputDir}`.split(' ')
  await waitForProcess(spawn('git', cloneArgs, defaultSpawnOptions))
}

async function pack() {
  const packedDir = './packed'
  if (fs.pathExistsSync(packedDir)) {
    await fsp.rm(packedDir, { recursive: true })
  }
  await fs.mkdirp(packedDir)

  await waitForProcess(spawn('npm', ['pack'], defaultSpawnOptions))
  const fileNames = await readdir('./')
  const tarballs = fileNames.filter(f => f.endsWith('.tgz'))
  console.log('tarballs: ', tarballs)

  if (tarballs.length === 0) {
    throw new Error('no tarball was created - cannot move to packed dir')
  }

  if (tarballs.length > 1) {
    throw new Error('multiple packed modules - delete them all and re-run')
  }

  console.log('moving tarball to packed dir')
  await fs.move(tarballs[0], path.join('packed', tarballs[0]))
}

async function cleanPackedTest() {
  await fsp.rm('packed-test/node_modules', { recursive: true })
  await fsp.rm('packed-test/package-lock.json')
  await fsp.rm('packed-test/generator-test', { recursive: true })
}

async function publishIfNoTempCode() {
  const generatorFile = './src/ProjectGenerator.ts'
  const generatorFileContents = await fsp.readFile(generatorFile, 'utf8')
  if (generatorFileContents.includes('useLocalFilesInsteadOfCloning = true')) {
    throw new Error('./src/ProjectGenerator.ts has useLocalFilesInsteadOfCloning set to true - will not publish')
  }

  await waitForProcess(spawn('npm', ['publish'], defaultSpawnOptions))
}

async function installPacked() {
  let voltaPath = getVoltaPathOrThrow()

  console.log('first ensuring dotnet-react-generator is not already installed globally')
  await uninstallGlobal()

  console.log('ensuring packed dir and tarball exist')
  const packedDir = './packed'
  const filenames = await readdir(packedDir)
  if (!filenames || filenames.length === 0) {
    throw new Error('no tarball was created - cannot install')
  }
  const filename = filenames[0]
  const tarballPath = path.join(packedDir, filename)
  args = ['run', '--', 'npm', 'install', '-g', tarballPath]
  console.log(`installing packed tarball at ${tarballPath}`)
  await waitForProcess(spawn(voltaPath, args, defaultSpawnOptions))
}

// Uninstall with both volta and npm in case we accidentally installed with one or the other
async function uninstallGlobal() {
  console.log('uninstalling dotnet-react-generator globally')

  console.log('uninstalling with volta')
  let args = ['run', '--', 'npm', 'uninstall', '-g', 'dotnet-react-generator']
  await waitForProcess(spawn('volta', args, defaultSpawnOptions))

  console.log('uninstalling with npm directly')
  args = ['uninstall', '-g', 'dotnet-react-generator']
  await waitForProcess(spawn('npm', args, defaultSpawnOptions))
}

function getVoltaPathOrThrow() {
  let voltaPath = which.sync('volta')
  if (!voltaPath) {
    throw new Error('volta is currently required (see ./docs/dev.md)')
  }
  voltaPath = `"${voltaPath}"`
  console.log(`using volta at path ${voltaPath}`)
  return voltaPath
}

exports.build = series(cleanDist, build)
exports.watch = series(cleanDist, watch)
exports.cloneRepoIntoTempDir = cloneSandboxRepoIntoTempDir
exports.pack = series(cleanDist, build, pack)
exports.clean = cleanDist
exports.cleanPackedTest = cleanPackedTest
exports.buildAndPublish = series(cleanDist, build, publishIfNoTempCode)
exports.installPackedGlobal = series(cleanDist, build, pack, installPacked)
exports.uninstallGlobal = uninstallGlobal
