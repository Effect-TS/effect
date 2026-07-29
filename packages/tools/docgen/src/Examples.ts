/**
 * @since 0.6.0
 */

import type { Plugin } from "vite"
import * as ExampleMetadata from "./ExampleMetadata.ts"
import type * as SemanticModel from "./SemanticModel.ts"

const collectorPrefix = "virtual:effect-docgen/collector?"
const examplePrefix = "virtual:effect-docgen/example?"
const resolvedMarker = "effect-docgen"

interface Request {
  readonly file: string
  readonly index?: number | undefined
}

const request = (prefix: string, id: string): Request | undefined => {
  if (!id.startsWith(prefix)) return undefined
  const parameters = new URLSearchParams(id.slice(prefix.length))
  const file = parameters.get("file")
  const index = parameters.get("index")
  if (file === null || (index !== null && !/^\d+$/.test(index))) return undefined
  return { file, index: index === null ? undefined : Number(index) }
}

const resolvedRequest = (id: string): (Request & { readonly kind: "collector" | "example" }) | undefined => {
  const query = id.indexOf("?")
  if (query === -1) return undefined
  const parameters = new URLSearchParams(id.slice(query + 1))
  const kind = parameters.get(resolvedMarker)
  if (kind !== "collector" && kind !== "example") return undefined
  const index = parameters.get("index")
  if (kind === "example" && (index === null || !/^\d+$/.test(index))) return undefined
  return {
    file: id.slice(0, query),
    index: index === null ? undefined : Number(index),
    kind
  }
}

const resolvedId = (kind: "collector" | "example", value: Request): string => {
  const parameters = new URLSearchParams({ [resolvedMarker]: kind })
  if (value.index !== undefined) parameters.set("index", String(value.index))
  return `${value.file}?${parameters}`
}

/** @internal */
export const collectorId = (file: string): string => `${collectorPrefix}${new URLSearchParams({ file })}`

const exampleId = (file: string, index: number): string =>
  `${examplePrefix}${new URLSearchParams({ file, index: String(index) })}`

const collectorModule = (examples: ReadonlyArray<SemanticModel.Example>): string => {
  const tests = examples.map((example, index) => {
    const metadata = ExampleMetadata.fromExample(example)
    return `test(${JSON.stringify(example.name)}, { meta: { docgenExample: ${
      JSON.stringify(metadata)
    } } }, () => import(${JSON.stringify(exampleId(example.declarationPathname, index))}))`
  })
  return `import { test } from "vitest"\n${tests.join("\n")}\n`
}

/**
 * Creates a Vite plugin that exposes extracted documentation examples as virtual modules.
 *
 * The original source files remain Vitest specifications, while every example executes in
 * its own module with imports resolved relative to the source file.
 *
 * @category testing
 * @since 0.6.0
 */
export const vitestPlugin = (examples: ReadonlyArray<SemanticModel.Example>): Plugin => {
  const byFile = new Map<string, ReadonlyArray<SemanticModel.Example>>()
  for (const example of examples) {
    const current = byFile.get(example.declarationPathname)
    byFile.set(example.declarationPathname, current === undefined ? [example] : [...current, example])
  }

  return {
    name: "effect-docgen-examples",
    enforce: "pre",
    resolveId(source, importer, options) {
      const collector = request(collectorPrefix, source)
      if (collector !== undefined && byFile.has(collector.file)) return resolvedId("collector", collector)
      const example = request(examplePrefix, source)
      if (example !== undefined && byFile.has(example.file)) return resolvedId("example", example)

      const parent = importer === undefined ? undefined : resolvedRequest(importer)
      if (parent?.kind !== "example") return null
      return this.resolve(source, parent.file, { ...options, skipSelf: true })
    },
    load(id) {
      const loaded = resolvedRequest(id)
      if (loaded === undefined) return null
      this.addWatchFile(loaded.file)
      const examples = byFile.get(loaded.file)
      if (examples === undefined) return null
      if (loaded.kind === "collector") return collectorModule(examples)
      const example = loaded.index === undefined ? undefined : examples[loaded.index]
      if (example === undefined) throw new Error(`Unknown documentation example module '${id}'`)
      return example.source
    }
  }
}
