const {series} = require('gulp')
const fs = require('fs-extra')
const fsp = require('fs').promises
const {waitForProcess, defaultSpawnOptions} = require('@mikeyt23/node-cli-utils')
const {spawn} = require('child_process')
const util = require('util')
const path = require('path')
const readdir = util.promisify(fs.readdir)

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
    await fsp.rm(packedDir, {recursive: true})
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
  await fsp.rm('packed-test/node_modules', {recursive: true})
  await fsp.rm('packed-test/package-lock.json')
  await fsp.rm('packed-test/generator-test', {recursive: true})
}

exports.build = series(cleanDist, build)
exports.watch = series(cleanDist, watch)
exports.cloneRepoIntoTempDir = cloneSandboxRepoIntoTempDir
exports.pack = series(cleanDist, build, pack)
exports.cleanPackedTest = cleanPackedTest
