export default class GeneratorArgs {
  constructor(
    public projectName: string,
    public url: string,
    public dbName: string,
    public overwriteOutputDir: boolean = false
  ) { }
}
