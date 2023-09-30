import assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { mkdirp } from '@mikeyt23/node-cli-utils'

export const tempDir = 'test/temp'

export const only = { only: true }

export async function ensureEmptyTempDir() {
  await fsp.rm(tempDir, { recursive: true, force: true })
  await mkdirp(tempDir)
}

export async function validateGitRepoTempExists() {
  if (!fs.existsSync(tempDir)) {
    await mkdirp(tempDir)
    return
  }
  if (!fs.existsSync('git-repo-temp')) {
    throw new Error('git-repo-temp does not exist. Run "swig cloneSandboxIntoTemp" first.')
  }
}

export function assertProjectExists(projectPath: string) {
  const resolvedProjectPath = path.resolve(projectPath)
  const projectDirExists = fs.existsSync(resolvedProjectPath)
  assert.strictEqual(projectDirExists, true, `Project directory not exist at ${resolvedProjectPath}`)
  const clientPackageJson = path.join(resolvedProjectPath, 'client/package.json')
  assert.strictEqual(fs.existsSync(clientPackageJson), true, `client/package.json not exist at ${clientPackageJson}`)
}

export function assertGeneratedEnvContains(envPath: string, expected: string) {
  if (!fs.existsSync(envPath)) {
    assert.fail(`The env file ${envPath} does not exist.`)
  }
  const env = fs.readFileSync(envPath, 'utf-8')
  assert.strictEqual(env.includes(expected), true, `The env file ${envPath} did not contain expected value "${expected}".`)
}

export function assertErrorMessageStartsWith(err: unknown, expectedStartsWith: string) {
  assert(err instanceof Error)
  assert.strictEqual(err.message.startsWith(expectedStartsWith), true, `Error message did not start with expected value. Actual: "${err.message}".`)
  return true
}

export function assertErrorMessageIncludes(err: unknown, expectedIncludes: string) {
  assert(err instanceof Error)
  assert.strictEqual(err.message.includes(expectedIncludes), true, `Error message did not include the expected value. Actual: "${err.message}".`)
  return true
}

export function assertErrorMessageEquals(err: unknown, expected: string) {
  assert(err instanceof Error)
  assert.strictEqual(err.message, expected, `Error message did not equal the expected value. Actual: "${err.message}".`)
  return true
}
