import {OptionValues} from 'commander'

const path = require('path')
const os = require('os')

type ProjectType = 'full' | 'no-db' | 'static'

export default class GeneratorArgs {
  public projectName: string
  public output: string
  public outputAbsolutePath: string
  public url: string
  public dbName: string
  public projectType: ProjectType = 'full'
  public overwriteOutputDir: boolean = false

  constructor(commanderOpts: OptionValues, currentWorkingDirectory: string) {
    // console.log('commanderOpts: ', commanderOpts)
    this.output = commanderOpts.output
    this.url = commanderOpts.url
    this.dbName = commanderOpts.dbName
    this.projectType = commanderOpts.hasOwnProperty('projectType') ? commanderOpts.projectType : 'full'
    this.overwriteOutputDir = commanderOpts.overwrite

    this.outputAbsolutePath = this.getProjectFullPath(commanderOpts.output, currentWorkingDirectory)
    this.projectName = this.getProjectName()
    // console.log('GeneratorArgs: ', JSON.stringify(this, null, 2))
  }

  private getProjectName(): string {
    const lastPathSeparatorIndex = this.outputAbsolutePath.lastIndexOf(path.sep)

    if (lastPathSeparatorIndex === -1) {
      return this.output
    }
    return this.outputAbsolutePath.substring(lastPathSeparatorIndex + 1)
  }

  private getProjectFullPath(outputArg: string, cwd: string): string {
    if (outputArg.startsWith('~')) {
      return path.normalize(outputArg.replace('~', os.homedir))
    } else if (this.pathIsAbsolute(outputArg)) {
      return path.normalize(outputArg)
    }
    return path.join(cwd, outputArg)
  }

  private pathIsAbsolute(pathStr: string): boolean {
    return (path.resolve(pathStr) === path.normalize(pathStr))
  }
}
