import type { Example } from "../SourceExamples.ts"

export interface ExampleMetadata {
  readonly name: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declaration: string
  readonly index: number
}

export const fromExample = (example: Example): ExampleMetadata => ({
  name: example.name,
  packageName: example.packageName,
  sourcePath: example.sourcePath,
  declaration: example.declarationKind === "staticMethod"
    ? `${example.declarationPath[0]}.static.${example.declarationPath.slice(1).join(".")}`
    : example.declarationPath.join("."),
  index: example.index
})
