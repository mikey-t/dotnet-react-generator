import { mkdirp } from '@mikeyt23/node-cli-utils'
import chalk from 'chalk'
import { OptionValues } from 'commander'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'path'
import { performance } from 'perf_hooks'
import GeneratorArgs from './GeneratorArgs.js'
import PlaceholderProcessor from './PlaceholderProcessor.js'
import { spawnAsync } from '@mikeyt23/node-cli-utils'

const useLocalFilesInsteadOfCloning = true // Combine true value here with 'swig cloneSandboxIntoTemp' to speed up dev loop

export default class ProjectGenerator {
  private readonly cwd: string
  private readonly generatedProjectPath: string
  private readonly args: GeneratorArgs
  private readonly localUrl: string
  private readonly composeProjectName: string

  constructor(commanderOpts: OptionValues, currentWorkingDirectory: string) {
    const generatorArgs = new GeneratorArgs(commanderOpts, currentWorkingDirectory)
    this.args = generatorArgs
    this.cwd = currentWorkingDirectory
    this.generatedProjectPath = generatorArgs.outputAbsolutePath
    this.localUrl = `local.${generatorArgs.url}`
    this.validateProjectName(this.args.projectName)
    this.composeProjectName = this.getComposeProjectNameFromProjectName(this.args.projectName)
  }

  printArgs() {
    console.log('Options:')
    console.log(JSON.stringify(this.args, null, 2))
    console.log('')
  }

  async generateProject() {
    await this.doStep(async () => this.ensureEmptyOutputDirectory(), 'ensure empty output directory')
    await this.doStep(async () => this.cloneProject(), 'clone project')
    await this.doStep(async () => this.updatePlaceholders(), 'update placeholders')
    // TODO: new step to copy readme and docs to new docs subdirectory and copy in new fresh readme to the root of the new project
  }

  // The projectName must be a valid directory name for the OS
  private validateProjectName(projectName: string) {
    if (!this.isValidDirName(projectName)) {
      throw Error(`Project name ${projectName} is invalid. It must contain only characters that are valid for directory names.`)
    }
  }

  // Requirements for the compose project name: "It must contain only lowercase letters, decimal digits, dashes, and underscores, and must begin with a lowercase letter or decimal digit."
  private getComposeProjectNameFromProjectName(projectName: string): string {
    let sanitized = projectName.toLowerCase()
    sanitized = sanitized.replace(/[^a-z0-9-_]/g, '_')
    if (!/^[a-z0-9]/.test(sanitized)) {
      sanitized = 'a' + sanitized
    }
    return sanitized
  }

  isValidDirName = (dirName: string): boolean => {
    // A regex pattern that excludes any characters not allowed in directory names across major OS
    const pattern = /^[^<>:"/\\|?*\x00-\x1F]+$/
    return pattern.test(dirName)
  }

  private validateComposeProjectName(composeProjectName: string) {
    const regex = /^[a-z0-9][a-z0-9_-]*$/g
    if (!regex.test(composeProjectName)) {
      throw Error(`COMPOSE_PROJECT_NAME ${composeProjectName} is invalid. It must contain only lowercase letters, decimal digits, dashes, and underscores, and must begin with a lowercase letter or decimal digit.`)
    }
  }

  private async ensureEmptyOutputDirectory() {
    const outputDir = this.generatedProjectPath
    const outputDirExists = fs.existsSync(outputDir)

    if (!outputDirExists) {
      return
    }

    if (this.args.overwriteOutputDir) {
      await fsp.rm(outputDir, { recursive: true })
      return
    }

    throw Error(`Path ${outputDir} already exists. Delete the directory first or use the --overwrite switch.`)
  }

  private async cloneProject() {
    await mkdirp(this.generatedProjectPath)

    if (useLocalFilesInsteadOfCloning) {
      const gitRepoTempPath = path.join(this.cwd, 'git-repo-temp')
      await fsp.cp(gitRepoTempPath, this.generatedProjectPath, { recursive: true })
    } else {
      const cloneArgs = `clone -b main --single-branch --depth 1 https://github.com/mikey-t/dotnet-react-sandbox.git ${this.generatedProjectPath}`.split(' ')
      await spawnAsync('git', cloneArgs, { throwOnNonZero: true })
    }

    await fsp.rm(path.join(this.generatedProjectPath, '.git'), { recursive: true })
  }

  private async updatePlaceholders() {
    const projectBasePath = this.generatedProjectPath
    const processor = new PlaceholderProcessor(this.cwd)
    const envTemplatePath = path.join(projectBasePath, '.env.template')
    await processor.replace(envTemplatePath, 'PROJECT_NAME=drs', `PROJECT_NAME=${this.args.projectName}`)
    await processor.replace(envTemplatePath, 'JWT_ISSUER=drs.mikeyt.net', `JWT_ISSUER=${this.args.url}`)
    await processor.replace(envTemplatePath, 'SITE_URL=local.drs.mikeyt.net', `SITE_URL=${this.localUrl}`)
    await processor.replace(envTemplatePath, 'DB_NAME=drs', `DB_NAME=${this.args.dbName}`)
    await processor.replace(envTemplatePath, 'DB_USER=drs', `DB_USER=${this.args.dbName}`)
    await processor.replace(envTemplatePath, 'COMPOSE_PROJECT_NAME=drs', `COMPOSE_PROJECT_NAME=${this.composeProjectName}`)

    const oldDotnetSlnPath = path.join(projectBasePath, 'server/dotnet-react-sandbox.sln')
    const newDotnetSlnPath = path.join(projectBasePath, `server/${this.args.projectName}.sln`)
    fs.renameSync(oldDotnetSlnPath, newDotnetSlnPath)

    await processor.replace(newDotnetSlnPath, 'dotnet-react-sandbox', this.args.projectName)

    await processor.replace(path.join(projectBasePath, 'client/src/components/Copyright.tsx'), 'Mike Thompson', 'John Doe')
    await processor.replace(path.join(projectBasePath, 'client/src/components/Copyright.tsx'), 'https://mikeyt.net', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
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

    console.log('deleting example-project directory')
    if (fs.existsSync(projectPath)) {
      await fsp.rm(projectPath, { recursive: true })
    }
  }
}
