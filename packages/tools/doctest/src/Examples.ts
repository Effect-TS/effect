/**
 * @since 4.0.0
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { normalizePath, type Plugin, searchForWorkspaceRoot } from "vite"
import type { TestUserConfig } from "vitest/config"
import * as ExampleMetadata from "./internal/ExampleMetadata.ts"
import * as Protocol from "./internal/Protocol.ts"
import DoctestSequencer from "./Sequencer.ts"
import type * as SourceExamplesModule from "./SourceExamples.ts"

const runner = "@effect/doctest/Runner"

const collectorModule = (
  examples: ReadonlyArray<SourceExamplesModule.Example>,
  version?: string | undefined
): string => {
  const tests = examples.map((example, index) => {
    const metadata = ExampleMetadata.fromExample(example)
    return `test(${JSON.stringify(example.name)}, { meta: { doctestExample: ${
      JSON.stringify(metadata)
    } } }, () => import(${JSON.stringify(Protocol.exampleId(example.declarationPathname, index, version))}))`
  })
  return `import { test } from "vitest"\n${tests.join("\n")}\n`
}

/**
 * Creates a Vite plugin that exposes extracted documentation examples as virtual modules.
 *
 * **Details**
 *
 * The plugin installs the doctest runner and a sequencer that removes source files without runnable examples before collection, then extracts examples from the remaining files when Vitest collects them. Every example executes in its own module, with imports resolved relative to the original source file.
 *
 * @category testing
 * @since 4.0.0
 */
export const vitestPlugin = (): Plugin => {
  const byFile = new Map<string, ReadonlyArray<SourceExamplesModule.Example>>()
  const cache = new Map<string, {
    readonly version: string | undefined
    readonly value: Promise<ReadonlyArray<SourceExamplesModule.Example>>
  }>()
  let sourceExamples: Promise<typeof SourceExamplesModule> | undefined
  let extractionOptions: Omit<SourceExamplesModule.ExtractFileOptions, "file"> | undefined

  const loadExamples = (
    file: string,
    version?: string | undefined
  ): Promise<ReadonlyArray<SourceExamplesModule.Example>> => {
    const cached = cache.get(file)
    if (cached !== undefined && cached.version === version) return cached.value
    const options = extractionOptions
    if (options === undefined) throw new Error("Doctest plugin has not been configured")
    sourceExamples ??= import("./SourceExamples.ts")
    const loaded = sourceExamples.then((SourceExamples) =>
      SourceExamples.extractFile({
        ...options,
        file
      }).then((examples) => {
        byFile.set(file, examples)
        return examples
      })
    )
    cache.set(file, { version, value: loaded })
    return loaded
  }

  return {
    name: "effect-doctest",
    enforce: "pre",
    perEnvironmentWatchChangeDuringDev: true,
    config() {
      const test: TestUserConfig = {
        runner,
        sequence: { sequencer: DoctestSequencer }
      }
      return {
        test
      }
    },
    configResolved(config) {
      const packageRoot = config.root
      const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))
      extractionOptions = {
        packageName: manifest.name as string,
        packageRoot,
        workspaceRoot: searchForWorkspaceRoot(packageRoot)
      }
    },
    resolveId(source, importer, options) {
      const collector = Protocol.request(Protocol.collectorPrefix, source)
      if (collector !== undefined) return Protocol.resolvedId("collector", collector)
      const example = Protocol.request(Protocol.examplePrefix, source)
      if (example !== undefined && byFile.has(example.file)) return Protocol.resolvedId("example", example)

      const parent = importer === undefined ? undefined : Protocol.resolvedRequest(importer)
      if (parent?.kind !== "example") return null
      return this.resolve(source, parent.file, { ...options, skipSelf: true })
    },
    load(id) {
      const loaded = Protocol.resolvedRequest(id)
      if (loaded === undefined) return null
      this.addWatchFile(loaded.file)
      return loadExamples(loaded.file, loaded.version).then((examples) => {
        if (loaded.kind === "collector") return collectorModule(examples, loaded.version)
        const example = loaded.index === undefined ? undefined : examples[loaded.index]
        if (example === undefined) throw new Error(`Unknown documentation example module '${id}'`)
        return example.source
      })
    },
    watchChange(id) {
      const normalized = normalizePath(id)
      for (const file of byFile.keys()) {
        if (normalizePath(file) === normalized) cache.delete(file)
      }
    }
  }
}
