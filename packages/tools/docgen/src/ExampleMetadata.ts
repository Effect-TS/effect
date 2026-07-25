/** @internal */
export const marker = "// @effect/docgen-example "

/** @internal */
export interface ExampleMetadata {
  readonly name: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declaration: string
  readonly index: number
}

const validate = (value: unknown): ExampleMetadata => {
  if (typeof value !== "object" || value === null) {
    throw new Error("metadata must be a JSON object")
  }
  const metadata = value as Record<string, unknown>
  for (const key of ["name", "packageName", "sourcePath", "declaration"] as const) {
    if (typeof metadata[key] !== "string" || metadata[key].length === 0) {
      throw new Error(`metadata field '${key}' must be a non-empty string`)
    }
  }
  if (!Number.isSafeInteger(metadata.index) || (metadata.index as number) < 1) {
    throw new Error("metadata field 'index' must be a positive integer")
  }
  return metadata as unknown as ExampleMetadata
}

/** @internal */
export const encode = (metadata: ExampleMetadata): string => `${marker}${JSON.stringify(validate(metadata))}`

/** @internal */
export const decode = (source: string): ExampleMetadata => {
  const firstLine = source.slice(0, source.indexOf("\n") === -1 ? source.length : source.indexOf("\n"))
  if (!firstLine.startsWith(marker)) {
    throw new Error(`missing '${marker.trim()}' metadata header`)
  }
  try {
    return validate(JSON.parse(firstLine.slice(marker.length)))
  } catch (error) {
    throw new Error(`invalid '${marker.trim()}' metadata header: ${globalThis.String(error)}`, { cause: error })
  }
}
