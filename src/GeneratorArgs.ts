import { OptionValues } from 'commander'

import path from 'node:path'
import os from 'node:os'
import { getHostname } from '@mikeyt23/node-cli-utils'

export default class GeneratorArgs {
  public projectName: string
  public output: string
  public outputAbsolutePath: string
  public url: string
  public dbName: string
  public overwriteOutputDir: boolean = false

  constructor(commanderOpts: OptionValues, currentWorkingDirectory: string) {
    this.output = commanderOpts.output
    this.url = getHostname(commanderOpts.url)
    this.dbName = commanderOpts.dbName
    this.overwriteOutputDir = commanderOpts.overwrite
    this.outputAbsolutePath = this.getProjectFullPath(commanderOpts.output, currentWorkingDirectory)
    this.projectName = this.getProjectName()
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
