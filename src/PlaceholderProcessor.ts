import fsp from 'node:fs/promises'

export default class PlaceholderProcessor {
  private readonly cwd: string

  constructor(currentWorkingDirectory: string) {
    this.cwd = currentWorkingDirectory
  }

  async replace(filePath: string, oldValue: string, newValue: string): Promise<void> {
    const relativeFilePath = filePath.replace(this.cwd, '')
    console.log(`replacing ${oldValue} with ${newValue} in ${relativeFilePath}`)

    const fileString = await fsp.readFile(filePath, { encoding: 'utf-8' })

    const startIndex = fileString.indexOf(oldValue)
    if (startIndex < 0) {
      throw Error(`replacement error: ${oldValue} not found in ${filePath}`)
    }

    const updatedFileString = fileString.replace(oldValue, newValue)

    await fsp.writeFile(filePath, updatedFileString, { encoding: 'utf-8' })
  }

  async replaceFile(filePath: string, newFileContents: string): Promise<void> {
    const relativeFilePath = filePath.replace(this.cwd, '')
    console.log(`replacing entire contents of ${relativeFilePath}`)
    await fsp.writeFile(filePath, newFileContents, { encoding: 'utf-8' })
  }
}
