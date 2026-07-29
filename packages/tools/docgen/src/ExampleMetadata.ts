/** @internal */
export interface ExampleMetadata {
  readonly name: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declaration: string
  readonly index: number
}

/** @internal */
export const fromExample = (example: {
  readonly packageName: string
  readonly sourcePath: string
  readonly declarationPath: ReadonlyArray<string>
  readonly declarationKind: string
  readonly index: number
  readonly name: string
}): ExampleMetadata => ({
  name: example.name,
  packageName: example.packageName,
  sourcePath: example.sourcePath,
  declaration: example.declarationKind === "staticMethod"
    ? `${example.declarationPath[0]}.static.${example.declarationPath.slice(1).join(".")}`
    : example.declarationPath.join("."),
  index: example.index
})
