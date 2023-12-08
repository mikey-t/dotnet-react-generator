import { ExtendedError, getNormalizedError, mkdirp, spawnAsync, which } from '@mikeyt23/node-cli-utils'
import { green } from '@mikeyt23/node-cli-utils/colors'
import { OptionValues } from 'commander'
import 'dotenv/config'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'path'
import { performance } from 'perf_hooks'
import GeneratorArgs from './GeneratorArgs.js'
import PlaceholderProcessor from './PlaceholderProcessor.js'

// Combine env var with command "swig cloneSandboxIntoTemp" to speed up dev loop
const useLocalFilesInsteadOfCloning = process.env.USE_LOCAL_INSTEAD_OF_CLONING === 'true'

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
    this.localUrl = generatorArgs.url
    this.validateProjectName(this.args.projectName)
    this.validateDbName(this.args.dbName)
    this.composeProjectName = this.getComposeProjectNameFromProjectName(this.args.projectName)
  }

  printArgs() {
    console.log('Options:')
    console.log(JSON.stringify(this.args, null, 2))
    console.log('')
  }

  async generateProject() {
    await this.doStep(async () => this.checkDependencies(), 'check dependencies')
    await this.doStep(async () => this.ensureEmptyOutputDirectory(), 'ensure empty output directory')
    await this.doStep(async () => this.cloneProject(), 'clone project')
    await this.doStep(async () => this.updatePlaceholders(), 'update placeholders')
    await this.doStep(async () => this.adjustDocs(), 'add readme file to generated project')
  }

  private async adjustDocs() {
    const readmePath = path.join(this.generatedProjectPath, 'README.md')

    await fsp.unlink(readmePath)

    fs.writeFileSync(readmePath, placeholderReadme.replace('{{PROJECT_NAME}}', this.args.projectName))
  }

  private validateProjectName(projectName: string) {
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-_.]*$/
    if (projectName.length > 80 || !regex.test(projectName)) {
      throw new Error(`Project name is invalid: ${projectName}. It must be less than 80 characters, start with a letter or number, and must only container letters, numbers and these special characters: "-_."`)
    }
  }

  private validateDbName(dbName: string) {
    const regex = /^[a-zA-Z][a-zA-Z0-9_]*$/
    if (dbName.length > 80 || !regex.test(dbName)) {
      throw new Error(`Database name is invalid: ${dbName}. It must be less than 80 characters, start with a letter, and must only container letters, numbers and underscores.`)
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

  private async checkDependencies() {
    if (!(await which('git')).location) {
      throw new Error('git is not installed. Install git and try again.')
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
    try {
      await mkdirp(this.generatedProjectPath)
    } catch (err) {
      throw new ExtendedError(`Error creating directory ${this.generatedProjectPath}`, getNormalizedError(err))
    }

    if (useLocalFilesInsteadOfCloning) {
      const tempRepoDir = 'git-repo-temp'
      console.log(`using local files instead of cloning: ${tempRepoDir}`)
      const gitRepoTempPath = path.resolve(tempRepoDir)
      if (!fs.existsSync(gitRepoTempPath)) {
        throw new Error(`git-repo-temp does not exist. Run "swig cloneSandboxIntoTemp" first.`)
      }
      await fsp.cp(gitRepoTempPath, this.generatedProjectPath, { recursive: true })
    } else {
      console.log('cloning project from github')
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

    const oldServerWorkspaceFile = 'server/drs-server.code-workspace'
    const oldClientWorkspaceFile = 'client/drs-client.code-workspace'
    const oldServerWorkspaceFilePath = path.join(projectBasePath, oldServerWorkspaceFile)
    const oldClientWorkspaceFilePath = path.join(projectBasePath, oldClientWorkspaceFile)

    const newServerWorkspaceFilePath = path.join(projectBasePath, oldServerWorkspaceFile.replace('drs', this.args.projectName))
    const newClientWorkspaceFilePath = path.join(projectBasePath, oldClientWorkspaceFile.replace('drs', this.args.projectName))

    fs.renameSync(oldServerWorkspaceFilePath, newServerWorkspaceFilePath)
    fs.renameSync(oldClientWorkspaceFilePath, newClientWorkspaceFilePath)

    await processor.replace(newServerWorkspaceFilePath, 'dotnet-react-sandbox.sln', `${this.args.projectName}.sln`)
    
    const rootLaunchConfig = path.join(projectBasePath, '.vscode/launch.json')
    const clientLaunchConfig = path.join(projectBasePath, 'client/.vscode/launch.json')
    await processor.replace(rootLaunchConfig, 'local.drs.mikeyt.net', this.args.url)
    await processor.replace(clientLaunchConfig, 'local.drs.mikeyt.net', this.args.url)
  }

  private async doStep(func: () => Promise<void>, stepName: string): Promise<void> {
    const stepStart = performance.now()
    console.log(green(`>>> starting: ${stepName}`))
    await func()
    const stepMillis = (performance.now() - stepStart).toFixed(1)
    console.log(green(`>>> finished: ${stepName} (${stepMillis}ms)\n`))
  }
}

const placeholderReadme = `# {{PROJECT_NAME}}

You generated a new project! Here are some things you should do next:

- Follow the setup instructions in [./docs/DotnetReactSandbox.md](./docs/DotnetReactSandbox.md)
- Update the LICENSE file (keep original license but rename it to something like ORIGINAL_PROJECT_LICENSE)
- Update this readme.md file
- Init your git repo and push it to github

`
