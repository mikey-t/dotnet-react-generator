const {waitForProcess, defaultSpawnOptions} = require('@mikeyt23/node-cli-utils')
const {spawn, spawnSync} = require('child_process')
const which = require('which')
const chalk = require('chalk')
const process = require('process')

export type Platform = 'win' | 'linux' | 'mac'
type DependenciesReport = { [id: string]: boolean }

export default class DependencyChecker {
  private readonly _platform: Platform

  constructor() {
    this._platform = this.getPlatform()
  }

  getPlatform(): Platform {
    const platform = process.platform

    if (platform === 'win32') {
      return 'win'
    } else if (platform === 'darwin') {
      return 'mac'
    } else if (platform === 'linux') {
      return 'linux'
    } else {
      throw Error(`Platform not supported: ${platform}. Nodejs process.platform must be win32, darwin or linux.`)
    }
  }

  async checkAllForDotnetReactSandbox(): Promise<DependenciesReport> {
    let report: DependenciesReport = {}

    report['Elevated Permissions'] = await this.hasElevatedPermissions()
    report['Git'] = await this.hasGit()
    report['Dotnet SDK >= 6'] = await this.hasDotnetSdkGreaterThanOrEqualTo(6)
    report['Nodejs >= 16'] = await this.hasNodejsGreaterThanOrEqualTo(16)
    report['Docker'] = await this.hasDocker()
    report['Openssl'] = await this.hasOpenssl()

    return report
  }

  hasAllDependencies(dependenciesReport: DependenciesReport): boolean {
    if (dependenciesReport === null) {
      return false
    }
    let failures = Object.fromEntries(Object.entries(dependenciesReport).filter(([, v]) => !v));
    return Object.keys(failures).length === 0
  }

  getFormattedReport(report: DependenciesReport): string {
    const platformKey = 'Platform'

    let longestKeyLength = Object.keys(report).sort((a: string, b: string) => b.length - a.length)[0].length
    if (platformKey.length > longestKeyLength) {
      longestKeyLength = platformKey.length
    }

    let str = '\n'

    const platformKeyPadding = ' '.repeat(longestKeyLength - platformKey.length)
    str += `${platformKey}${platformKeyPadding}: ${this._platform}\n`

    for (let k in report) {
      const hasIt = report[k]
      const padding = ' '.repeat(longestKeyLength - k.length)
      str += `${k}${padding}: ${hasIt ? chalk.green('true') : chalk.red('false')}\n`
    }

    return str
  }

  async hasElevatedPermissions(): Promise<boolean> {
    if (this._platform === 'win') {
      return await this.winHasElevatedPerms()
    } else if (this._platform === 'linux') {
      return await this.linuxHasElevatedPerms()
    } else if (this._platform === 'mac') {
      return await this.linuxHasElevatedPerms()
    }

    return false
  }

  async winHasElevatedPerms(): Promise<boolean> {
    try {
      const spawnOptions = {...defaultSpawnOptions, stdio: 'ignore'}
      await waitForProcess(spawn('net', ['session'], spawnOptions))
      return true
    } catch {
      return false
    }
  }

  async linuxHasElevatedPerms(): Promise<boolean> {
    const uid = process.getuid()
    return uid === 0
  }

  async hasGit(): Promise<boolean> {
    return which.sync('git', {nothrow: true}) !== null
  }

  async hasDotnetSdkGreaterThanOrEqualTo(minimumMajorVersion: number): Promise<boolean> {
    if (!which.sync('dotnet', {nothrow: true})) {
      return false
    }

    let childProc = spawnSync('dotnet', ['--list-sdks'], {encoding: 'utf-8'})
    if (childProc.error) {
      return false
    }

    const lines = childProc.stdout.split('\n').filter((line: string) => !!line)
    const lastLine = lines[lines.length - 1]
    let latestMajorVersion: number
    try {
      latestMajorVersion = parseInt(lastLine.substring(0, lastLine.indexOf('.')))
    } catch {
      throw Error('error parsing results of dotnet --list-sdks')
    }

    return latestMajorVersion >= minimumMajorVersion
  }

  async hasNodejsGreaterThanOrEqualTo(minimumMajorVersion: number): Promise<boolean> {
    if (!which.sync('node', {nothrow: true})) {
      return false
    }

    let childProc = spawnSync('node', ['-v'], {encoding: 'utf-8'})
    if (childProc.error) {
      return false
    }

    const output = childProc.stdout
    if (!output || output.length === 0) {
      return false
    }

    if (!output.startsWith('v')) {
      throw Error('unexpected output for node -v')
    }

    let foundMajorVersion: number
    try {
      foundMajorVersion = parseInt(output.substring(1, output.indexOf('.')))
    } catch {
      throw Error('error parsing node version')
    }

    return foundMajorVersion >= minimumMajorVersion
  }

  async hasDocker(): Promise<boolean> {
    return !!which.sync('docker', {nothrow: true})
  }

  async hasOpenssl(): Promise<boolean> {
    if (this._platform === 'mac') {
      let childProc = spawnSync('brew', ['--prefix', 'openssl'], { encoding: 'utf-8' })
      if (childProc.error) {
        return false
      }

      const output = childProc.stdout

      if (!output || output.length === 0) {
        return false
      }

      return !output.toLowerCase().startsWith('error');
    }

    return !!which.sync('openssl', {nothrow: true})
  }
}
