import GeneratorArgs from './GeneratorArgs'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs-extra'
import PlaceholderProcessor from './PlaceholderProcessor'
import { performance } from 'perf_hooks'
import chalk from 'chalk'
import DependencyChecker, { Platform } from './DependencyChecker'
import { OptionValues } from 'commander'
const os = require('os')

const { waitForProcess, defaultSpawnOptions } = require('@mikeyt23/node-cli-utils')
const fsp = require('fs').promises
const process = require('process')
const { spawnSync } = require('child_process')

const useLocalFilesInsteadOfCloning = false // Combine true value here with gulp task cloneRepoIntoTempDir to speed up dev loop

export default class ProjectGenerator {
  private readonly _cwd: string
  private readonly _projectPath: string
  private readonly _args: GeneratorArgs
  private readonly _cwdSpawnOptions: object
  private readonly _localUrl: string
  private readonly _depsChecker: DependencyChecker
  private readonly _platform: Platform
  private _sudoerUsername: string = ''

  constructor(commanderOpts: OptionValues, currentWorkingDirectory: string, dependencyChecker: DependencyChecker = new DependencyChecker()) {
    const generatorArgs = new GeneratorArgs(commanderOpts, currentWorkingDirectory)
    this._args = generatorArgs
    this._cwd = currentWorkingDirectory
    this._projectPath = generatorArgs.outputAbsolutePath
    this._cwdSpawnOptions = { ...defaultSpawnOptions, cwd: this._projectPath }
    this._localUrl = `local.${generatorArgs.url}`
    this._depsChecker = dependencyChecker
    this._platform = dependencyChecker.getPlatform()
  }

  printArgs() {
    console.log('Options:')
    console.log(JSON.stringify(this._args, null, 2))
    console.log('')
  }

  async generateProject() {
    await this.doStep(async () => this.checkDependencies(), 'check dependencies')

    if (this._platform !== 'win') {
      this.populateSudoerUsername()
    }

    await this.doStep(async () => this.ensureEmptyOutputDirectory(), 'ensure empty output directory')
    await this.doStep(async () => this.cloneProject(), 'clone project')
    await this.doStep(async () => this.updatePlaceholders(), 'update placeholders')

    if (this._platform !== 'win') {
      await this.doStep(async () => this.chown(), 'chown on output directory')
    }

    await this.doStep(async () => this.addHostsEntry(), 'add hosts entry')
    await this.doStep(async () => this.npmInstallProjectRoot(), 'run npm install in new project root')
    await this.doStep(async () => this.syncEnvFiles(), 'syncEnvFiles')
    await this.doStep(async () => this.installOrUpdateDotnetEfTool(), 'install or update dotnet ef tool')
    await this.doStep(async () => this.generateCert(), 'generate self-signed ssl cert')

    if (this._platform === 'win') {
      // Chrome on Linux does not use system certificates without significant extra configuration.
      // Mac support for adding certs via CLI is obnoxiously bad and different depending
      // on the specific macOS version - see manual instruction in dotnet-react-sandbox readme.
      await this.doStep(async () => this.installCert(), 'install self-signed ssl cert')
    }

    await this.doStep(async () => this.clientAppNpmInstall(), 'run npm install in new project\'s client directory')
  }

  private populateSudoerUsername() {
    let sudoerId = process.env.SUDO_UID

    if (sudoerId === undefined) {
      throw Error('cannot get sudoer username - process not started with sudo')
    }

    console.log(`attempting to find username for sudoer id ${sudoerId}`)

    let childProcess = spawnSync('id', ['-nu', sudoerId], { encoding: 'utf8' })
    if (childProcess.error) {
      throw childProcess.error
    }

    let username = childProcess.stdout

    if (!username) {
      throw Error('unable to get sudoer username')
    }

    username = username.replace('\n', '')

    console.log(`using sudoer username: ${username}`)

    this._sudoerUsername = username
  }

  async chown(): Promise<void> {
    const userId = process.env.SUDO_UID
    if (!userId) {
      throw Error('could not get your user id to run chown')
    }

    if (this._platform === 'linux') {
      await waitForProcess(spawn('sudo', ['chown', '-R', `${userId}:${userId}`, this._projectPath], defaultSpawnOptions))
    } else if (this._platform === 'mac') {
      await waitForProcess(spawn('sudo', ['chown', '-R', `${userId}`, this._projectPath], defaultSpawnOptions))
    }
  }

  private async checkDependencies() {
    const report = await this._depsChecker.checkAllForDotnetReactSandbox()
    console.log(this._depsChecker.getFormattedReport(report))
    const depsCheckPassed = this._depsChecker.hasAllDependencies(report)
    console.log(`Dependencies check passed: ${depsCheckPassed ? chalk.green('true') : chalk.red('false')}`,)
    if (!depsCheckPassed) {
      throw Error(chalk.red('dependencies check failed - see above'))
    }
  }

  private async ensureEmptyOutputDirectory() {
    const outputDir = this._projectPath
    const outputDirExists = fs.pathExistsSync(outputDir)

    if (!outputDirExists) {
      return
    }

    if (this._args.overwriteOutputDir) {
      await fsp.rm(outputDir, { recursive: true })
      return
    }

    throw Error(`Path ${outputDir} already exists. Delete the directory first or use the --overwrite switch.`)
  }

  private async cloneProject() {
    await fs.mkdirp(this._projectPath)

    if (useLocalFilesInsteadOfCloning) {
      const gitRepoTempPath = path.join(this._cwd, 'git-repo-temp')
      await fs.copy(gitRepoTempPath, this._projectPath)
    } else {
      const cloneArgs = `clone -b main --single-branch --depth 1 https://github.com/mikey-t/dotnet-react-sandbox.git ${this._projectPath}`.split(' ')
      await waitForProcess(spawn('git', cloneArgs, defaultSpawnOptions))
    }

    await fsp.rm(path.join(this._projectPath, '.git'), { recursive: true })
  }

  private async updatePlaceholders() {
    const projectBasePath = this._projectPath
    const processor = new PlaceholderProcessor(this._cwd)
    const envTemplatePath = path.join(projectBasePath, '.env.template')
    processor.replace(envTemplatePath, 'PROJECT_NAME=drs', `PROJECT_NAME=${this._args.projectName}`)
    processor.replace(envTemplatePath, 'JWT_ISSUER=drs.mikeyt.net', `JWT_ISSUER=${this._args.url}`)
    processor.replace(envTemplatePath, 'SITE_URL=local.drs.mikeyt.net:3000', `SITE_URL=${this._localUrl}:3000`)
    processor.replace(envTemplatePath, 'DEV_CERT_NAME=local.drs.mikeyt.net.pfx', `DEV_CERT_NAME=${this._localUrl}.pfx`)
    processor.replace(envTemplatePath, 'DB_NAME=drs', `DB_NAME=${this._args.dbName}`)
    processor.replace(envTemplatePath, 'DB_USER=drs', `DB_USER=${this._args.dbName}`)

    const testSettingsPath = path.join(projectBasePath, 'src/WebServer.Test/TestSettings.cs')
    processor.replace(testSettingsPath, 'test_drs', `test_${this._args.dbName}`)

    const oldDotnetSlnPath = path.join(projectBasePath, 'dotnet-react-sandbox.sln')
    const newDotnetSlnPath = path.join(projectBasePath, `${this._args.projectName}.sln`)
    fs.renameSync(oldDotnetSlnPath, newDotnetSlnPath)

    processor.replace(newDotnetSlnPath, 'dotnet-react-sandbox', this._args.projectName)
    processor.replace(newDotnetSlnPath, 'dotnet-react-sandbox', this._args.projectName)

    processor.replace(path.join(projectBasePath, 'README.md'), 'dotnet-react-sandbox', this._args.projectName)

    processor.replace(path.join(projectBasePath, 'src/client/src/components/Copyright.tsx'), 'Mike Thompson', 'John Doe')
    processor.replace(path.join(projectBasePath, 'src/client/src/components/Copyright.tsx'), 'https://mikeyt.net', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }

  private async addHostsEntry() {
    const hostsPath = this._platform === 'win' ? 'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts'
    const entry = `127.0.0.1 ${this._localUrl}`

    const hostsFileString = fs.readFileSync(hostsPath)
    if (hostsFileString.indexOf(entry) > -1) {
      console.log(`host entry already found, skipping (${entry})`)
      return
    }

    console.log(`adding hosts entry: ${entry}`)
    fs.appendFileSync(hostsPath, `\n${entry}`)
  }

  private async npmInstallProjectRoot() {
    if (this._platform === 'win') {
      await waitForProcess(spawn('npm', ['install'], this._cwdSpawnOptions))
    } else {
      await this.runAsSudoer('npm install', this._cwdSpawnOptions)
    }
  }

  private async runAsSudoer(cmd: string, spawnOptions: any) {
    let cmdArgs = `-H -u ${this._sudoerUsername} bash -c`.split(' ')
    cmdArgs.push(`'${cmd}'`)
    await waitForProcess(spawn('sudo', cmdArgs, spawnOptions))
  }

  private async syncEnvFiles() {
    await waitForProcess(spawn('npm', ['run', 'syncEnvFiles'], this._cwdSpawnOptions))
  }

  private async installOrUpdateDotnetEfTool() {
    if (this._platform === 'win') {
      const cmdArgs = `run installDotnetEfTool || npm run updateDotnetEfTool`.split(' ')
      await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
    } else if (this._platform === 'linux') {
      await this.runAsSudoer('dotnet tool install --global dotnet-ef  || dotnet tool update --global dotnet-ef', defaultSpawnOptions)
    }
  }

  private async generateCert() {
    if (this._platform === 'mac') {
      throw Error('cert generation not yet supported')
    }
    const cmdArgs = `run opensslGenCert -- --url=${this._localUrl}`.split(' ')
    await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
  }

  private async installCert() {
    let cmdArgs: string[] = []
    if (this._platform === 'win') {
      cmdArgs = `run winInstallCert -- --name=${this._localUrl}.pfx`.split(' ')
      await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
    } else if (this._platform === 'linux') {
      console.log('linux cert automated install not supported - see manual instructions in dotnet-react-sandbox readme')
    } else if (this._platform === 'mac') {
      throw Error('mac cert install not implemented yet')
    }
  }

  private async clientAppNpmInstall() {
    const clientDir = path.join(this._projectPath, 'src/client')
    const spawnOptions = { ...defaultSpawnOptions, cwd: clientDir }
    if (this._platform === 'win') {
      await waitForProcess(spawn('npm', ['install'], spawnOptions))
    } else if (this._platform === 'linux') {
      await this.runAsSudoer('npm install', spawnOptions)
    }
  }

  private async doStep(func: Function, stepName: string): Promise<void> {
    const stepStart = performance.now()
    console.log(chalk.green(`>>> starting: ${stepName}`))
    await func()
    const stepMillis = (performance.now() - stepStart).toFixed(1)
    console.log(chalk.green(`>>> finished: ${stepName} (${stepMillis}ms)\n`))
  }

  static async cleanupExampleProject(cwd: string) {
    console.log('>>> cleaning up example project...')
    const projectPath = path.join(cwd, 'example-project')

    console.log('removing host entry')
    const hostsPath = process.platform === 'win32' ? 'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts'
    const fileString = fs.readFileSync(hostsPath, 'utf-8')
    const entry = `\n127.0.0.1 local.example.mikeyt.net`
    const newFileString = fileString.replace(new RegExp(entry, 'g'), '')
    fs.writeFileSync(hostsPath, newFileString)

    console.log('deleting example-project directory')
    if (fs.pathExistsSync(projectPath)) {
      await fsp.rm(projectPath, { recursive: true })
    }

    if (process.platform !== 'win32') return

    await ProjectGenerator.uninstallExampleCert(cwd)
  }

  private static async uninstallExampleCert(cwd: string) {
    const psCommand = `$env:PSModulePath = [Environment]::GetEnvironmentVariable('PSModulePath', 'Machine'); Get-ChildItem Cert:\\LocalMachine\\Root | Where-Object { $_.Subject -match 'local.example.mikeyt.net' } | Remove-Item`;
    await waitForProcess(spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand]))
  }
}
