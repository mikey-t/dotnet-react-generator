import { spawnSync } from 'node:child_process'
import chalk from 'chalk'
import { platform as rawPlatformString } from 'node:process'
import { whichSync, isPlatformWindows, isPlatformLinux, isPlatformMac, spawnAsync } from '@mikeyt23/node-cli-utils'

export type Platform = 'win' | 'linux' | 'mac'
type DependenciesReport = { [id: string]: boolean }

export default class DependencyChecker {
  private readonly platform: Platform

  constructor() {
    this.platform = this.getPlatform()
  }

  getPlatform(): Platform {

    if (isPlatformWindows()) {
      return 'win'
    } else if (isPlatformMac()) {
      return 'mac'
    } else if (isPlatformLinux()) {
      return 'linux'
    } else {
      throw Error(`Platform not supported: ${rawPlatformString}. Nodejs process.platform must be win32, darwin or linux.`)
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
    let failures = Object.fromEntries(Object.entries(dependenciesReport).filter(([, v]) => !v))
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
    str += `${platformKey}${platformKeyPadding}: ${this.platform}\n`

    for (let k in report) {
      const hasIt = report[k]
      const padding = ' '.repeat(longestKeyLength - k.length)
      str += `${k}${padding}: ${hasIt ? chalk.green('true') : chalk.red('false')}\n`
    }

    return str
  }

  async hasElevatedPermissions(): Promise<boolean> {
    if (this.platform === 'win') {
      return await this.winHasElevatedPerms()
    } else if (this.platform === 'linux') {
      return await this.linuxHasElevatedPerms()
    } else if (this.platform === 'mac') {
      return await this.linuxHasElevatedPerms()
    }

    return false
  }

  async winHasElevatedPerms(): Promise<boolean> {
    try {
      await spawnAsync('net', ['session'], { throwOnNonZero: true, stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  async linuxHasElevatedPerms(): Promise<boolean> {
    if (!process.getuid) {
      throw new Error('Cannot determine if linux user has elevated permissions (process.getuid is undefined)')
    }
    const uid = process.getuid()
    return uid === 0
  }

  async hasGit(): Promise<boolean> {
    return !!whichSync('git').location
  }

  async hasDotnetSdkGreaterThanOrEqualTo(minimumMajorVersion: number): Promise<boolean> {
    if (!whichSync('dotnet').location) {
      return false
    }

    let childProc = spawnSync('dotnet', ['--list-sdks'], { encoding: 'utf-8' })
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
    if (!whichSync('node').location) {
      return false
    }

    let childProc = spawnSync('node', ['-v'], { encoding: 'utf-8' })
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
    return !!whichSync('docker')
  }

  async hasOpenssl(): Promise<boolean> {
    if (this.platform === 'mac') {
      let childProc = spawnSync('brew', ['--prefix', 'openssl'], { encoding: 'utf-8' })
      if (childProc.error) {
        return false
      }

      const output = childProc.stdout

      if (!output || output.length === 0) {
        return false
      }

      return !output.toLowerCase().startsWith('error')
    }

    return !!whichSync('openssl').location
  }
}
