import assert from 'node:assert'
import { it, describe, before, beforeEach } from 'node:test'
import ProjectGenerator from '../src/ProjectGenerator.js'
import path from 'node:path'
import { assertProjectExists, ensureEmptyTempDir, validateGitRepoTempExists, tempDir, assertErrorMessageStartsWith, assertGeneratedEnvContains, only } from './testUtils.js'

console.log(`\nDon't forget to get a fresh copy of dotnet-react-sandbox with 'swig cloneSandboxIntoTemp'.\n`)

const defaultOptions = {
  output: 'example-project',
  url: 'example.mikeyt.net',
  dbName: 'example_mikeyt',
  overwrite: true
}

describe('ProjectGenerator.generateProject', only, () => {
  before(async () => {
    await validateGitRepoTempExists()
  })
  beforeEach(async () => {
    await ensureEmptyTempDir()
  })
  it('generates a project with default options', async () => {
    await new ProjectGenerator(defaultOptions, tempDir).generateProject()
    assertProjectExists(path.join(tempDir, defaultOptions.output))
  })
  it('works with a relative path', async () => {
    const outputPath = 'sub-dir/project-name'
    const options = { ...defaultOptions, output: outputPath }

    await new ProjectGenerator(options, tempDir).generateProject()

    assertProjectExists(path.join(tempDir, outputPath))
  })
  it('works with an absolute output path', async () => {
    const outputPath = path.resolve(tempDir, 'sub-dir/project-name')
    console.log(`absolute outputPath: ${outputPath}`)
    const options = { ...defaultOptions, output: outputPath }

    await new ProjectGenerator(options, tempDir).generateProject()

    assertProjectExists(outputPath)
  })
  it('strips the protocol from the provided url', only, async () => {
    const options = { ...defaultOptions, url: 'http://example.mikeyt.net' }

    await new ProjectGenerator(options, tempDir).generateProject()

    const outputPath = path.join(tempDir, defaultOptions.output)
    const envTemplatePath = path.join(outputPath, '.env.template')
    assertProjectExists(outputPath)
    assertGeneratedEnvContains(envTemplatePath, 'JWT_ISSUER=example.mikeyt.net')
    assertGeneratedEnvContains(envTemplatePath, 'SITE_URL=example.mikeyt.net')
  })
})

describe('ProjectGenerator.ctor', () => {
  before(async () => {
    await validateGitRepoTempExists()
  })
  beforeEach(async () => {
    await ensureEmptyTempDir()
  })
  it('throws if bad chars in path', async () => {
    const options = { ...defaultOptions, output: 'this<is>a-bad-path/project-name' }

    await assert.rejects(
      new ProjectGenerator(options, tempDir).generateProject(),
      err => assertErrorMessageStartsWith(err, 'Error creating directory')
    )
  })
  it('throws if the project name is invalid', async () => {
    const options = { ...defaultOptions, output: 'bad-chars-!@#$%^&*()' }
    assert.throws(
      () => new ProjectGenerator(options, tempDir),
      err => assertErrorMessageStartsWith(err, 'Project name is invalid')
    )
  })

  it('throws if the database name is invalid', async () => {
    const options = { ...defaultOptions, dbName: 'db-name-with-dashes' }
    assert.throws(
      () => new ProjectGenerator(options, tempDir),
      err => assertErrorMessageStartsWith(err, 'Database name is invalid')
    )
  })
})
