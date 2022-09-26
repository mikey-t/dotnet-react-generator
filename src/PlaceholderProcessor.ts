const fs = require('fs-extra')

export default class PlaceholderProcessor {
  private readonly _cwd: string

  constructor(currentWorkingDirectory: string) {
    this._cwd = currentWorkingDirectory
  }

  replace(filePath: string, oldValue: string, newValue: string): void {
    const relativeFilePath = filePath.replace(this._cwd, '')
    console.log(`replacing ${oldValue} with ${newValue} in ${relativeFilePath}`)

    let fileString = fs.readFileSync(filePath, 'utf-8')

    const startIndex = fileString.indexOf(oldValue)
    if (startIndex < 0) {
      throw Error(`replacement error: ${oldValue} not found in ${filePath}`)
    }

    const updatedFileString = fileString.replace(oldValue, newValue)

    fs.writeFileSync(filePath, updatedFileString)
  }

  replaceFile(filePath: string, newFileContents: string): void {
    const relativeFilePath = filePath.replace(this._cwd, '')
    console.log(`replacing entire contents of ${relativeFilePath}`)
    fs.writeFileSync(filePath, newFileContents)
  }
}
