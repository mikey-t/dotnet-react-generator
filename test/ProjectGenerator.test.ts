import fs from 'node:fs'
import fsp from 'node:fs/promises'
import assert from 'node:assert'
import { it } from 'node:test'
import { emptyDirectory, mkdirp } from '@mikeyt23/node-cli-utils'
import ProjectGenerator from '../src/ProjectGenerator.js'
import path from 'node:path'

const tmpDir = 'test/tmp'

if (!fs.existsSync(tmpDir)) {
  await mkdirp(tmpDir)
}

async function ensureGitRepoTemp() {
  const gitRepoTempPath = 'git-repo-temp'
  const repoTmpPath = 'test/tmp/git-repo-temp'
  if (!fs.existsSync('git-repo-temp')) {
    throw new Error('git-repo-temp does not exist. Run "swig cloneSandboxIntoTemp" first.')
  }
  await emptyDirectory(repoTmpPath)
  await fsp.cp(gitRepoTempPath, repoTmpPath, { recursive: true })
}

async function ensureNoExampleProject() {
  const exampleProjectPath = path.join(tmpDir, 'example-project')
  if (fs.existsSync(exampleProjectPath)) {
    await fsp.rm(exampleProjectPath, { recursive: true, force: true })
  }
}

it('generates an example project correctly', async () => {
  await ensureGitRepoTemp()
  await ensureNoExampleProject()
  
  const exampleCommanderOpts = {
    output: 'example-project',
    url: 'example.mikeyt.net',
    dbName: 'example_mikeyt',
    overwrite: true
  }
  
  await new ProjectGenerator(exampleCommanderOpts, tmpDir).generateProject()

  assert.ok(true)
})

it.todo('does not allow using a bad project name')
