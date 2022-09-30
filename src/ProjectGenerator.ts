import GeneratorArgs from './GeneratorArgs'
import path from 'path'
import {spawn} from 'child_process'
import fs from 'fs-extra'
import PlaceholderProcessor from './PlaceholderProcessor'
import {performance} from 'perf_hooks'
import chalk from 'chalk'
import DependencyChecker from './DependencyChecker'
import {OptionValues} from 'commander'

const {waitForProcess, defaultSpawnOptions} = require('@mikeyt23/node-cli-utils')
const fsp = require('fs').promises

const useLocalFilesInsteadOfCloning = false // Combine true value here with gulp task cloneRepoIntoTempDir to speed up dev loop
const runOnlyFirstFourSteps = false

export default class ProjectGenerator {
  private readonly _cwd: string
  private readonly _projectPath: string
  private readonly _args: GeneratorArgs
  private readonly _cwdSpawnOptions: object
  private readonly _localUrl: string
  private readonly _depsChecker: DependencyChecker

  constructor(commanderOpts: OptionValues, currentWorkingDirectory: string, dependencyChecker: DependencyChecker = new DependencyChecker()) {
    const generatorArgs = new GeneratorArgs(commanderOpts, currentWorkingDirectory)
    this._args = generatorArgs
    this._cwd = currentWorkingDirectory
    this._projectPath = generatorArgs.outputAbsolutePath
    this._cwdSpawnOptions = {...defaultSpawnOptions, cwd: this._projectPath}
    this._localUrl = `local.${generatorArgs.url}`
    this._depsChecker = dependencyChecker
  }

  printArgs() {
    console.log('Options:')
    console.log(JSON.stringify(this._args, null, 2))
    console.log('')
  }

  async generateProject() {
    await this.doStep(async () => this.checkDependencies(), 'check dependencies')
    await this.doStep(async () => this.ensureEmptyOutputDirectory(), 'ensure empty output directory')
    await this.doStep(async () => this.cloneProject(), 'clone project')
    await this.doStep(async () => this.updatePlaceholders(), 'update placeholders')
    if (!runOnlyFirstFourSteps) {
      await this.doStep(async () => this.addHostsEntry(), 'add hosts entry')
      await this.doStep(async () => this.npmInstallProjectRoot(), 'run npm install in new project root')
      await this.doStep(async () => this.syncEnvFiles(), 'syncEnvFiles')
      await this.doStep(async () => this.installOrUpdateDotnetEfTool(), 'install or update dotnet ef tool')
      await this.doStep(async () => this.generateCert(), 'generate self-signed ssl cert')
      await this.doStep(async () => this.installCert(), 'install self-signed ssl cert')
      await this.doStep(async () => this.clientAppNpmInstall(), 'run npm install in new project\'s client dir')
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
      await fsp.rm(outputDir, {recursive: true})
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
  }

  private async addHostsEntry() {
    const hostsPath = 'C:/Windows/System32/drivers/etc/hosts'
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
    await waitForProcess(spawn('npm', ['install'], this._cwdSpawnOptions))
  }

  private async syncEnvFiles() {
    await waitForProcess(spawn('npm', ['run', 'syncEnvFiles'], this._cwdSpawnOptions))
  }

  private async installOrUpdateDotnetEfTool() {
    const cmdArgs = `run installDotnetEfTool || npm run updateDotnetEfTool`.split(' ')
    await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
  }

  private async generateCert() {
    const cmdArgs = `run opensslGenCert -- --url=${this._localUrl}`.split(' ')
    await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
  }

  private async installCert() {
    const cmdArgs = `run winInstallCert -- --name=${this._localUrl}.pfx`.split(' ')
    await waitForProcess(spawn('npm', cmdArgs, this._cwdSpawnOptions))
  }

  private async clientAppNpmInstall() {
    const clientDir = path.join(this._projectPath, 'src/client')
    const spawnOptions = {...defaultSpawnOptions, cwd: clientDir}
    await waitForProcess(spawn('npm', ['install'], spawnOptions))
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
    const hostsPath = 'C:/Windows/System32/drivers/etc/hosts'
    const fileString = fs.readFileSync(hostsPath, 'utf-8')
    const entry = `\n127.0.0.1 local.example.mikeyt.net`
    const newFileString = fileString.replace(new RegExp(entry, 'g'), '')
    fs.writeFileSync(hostsPath, newFileString)

    console.log('deleting example-project directory')
    if (fs.pathExistsSync(projectPath)) {
      await fsp.rm(projectPath, {recursive: true})
    }

    await ProjectGenerator.uninstallExampleCert(cwd)
  }

  private static async uninstallExampleCert(cwd: string) {
    console.log('uninstalling cert')
    const psFilename = 'UninstallExampleCert.ps1'
    const psFilePath = path.join(cwd, psFilename)
    if (fs.pathExistsSync(psFilePath)) {
      await fsp.rm(psFilePath)
    }
    const psFileContents = 'Get-ChildItem Cert:\\\\LocalMachine\\\\Root | Where-Object { $_.Subject -match \'local.example.mikeyt.net\' } | Remove-Item'
    fs.writeFileSync(psFilePath, psFileContents)
    await waitForProcess(spawn('powershell', ['-File', psFilename], {...defaultSpawnOptions, cwd: cwd}))
    await fsp.rm(psFilePath)
  }
}
