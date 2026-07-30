/**
 * @since 4.0.0
 */

import { createHash as Doctest } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"
import { normalizePath, type Plugin, type UserConfig } from "vite"
import { defaultInclude, type TestUserConfig } from "vitest/config"
import * as Protocol from "./Protocol.ts"
import type * as Source from "./Source.ts"

const runner = "@effect/doctest/Runner"

const runnerModule = (config: UserConfig): string => {
  const configuredRunner = config.test?.runner
  const baseRunner = configuredRunner !== undefined && !isAbsolute(configuredRunner) && configuredRunner.startsWith(".")
    ? resolve(config.root ?? process.cwd(), configuredRunner)
    : configuredRunner
  const root = resolve(config.root ?? process.cwd())
  const cacheDir = resolve(root, config.cacheDir ?? "node_modules/.vite", "effect-doctest")
  const hash = Doctest("sha256").update(baseRunner ?? "default").digest("hex").slice(0, 16)
  const file = join(cacheDir, `runner-${hash}.mjs`)
  const baseImport = baseRunner === undefined
    ? `import { TestRunner as BaseRunner } from "vitest"`
    : `import BaseRunner from ${JSON.stringify(baseRunner)}`
  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(
    file,
    `${baseImport}\nimport { wrap } from ${JSON.stringify(runner)}\nexport default wrap(BaseRunner, ${
      JSON.stringify(config.test?.include ?? defaultInclude)
    }, ${JSON.stringify(root)})\n`
  )
  return file
}

const collectorModule = (
  file: string,
  examples: ReadonlyArray<Source.Snippet>,
  version?: string | undefined
): string => {
  const tests = examples.map((example, index) => {
    return `test(${JSON.stringify(example.name ?? `line ${example.line}`)}, () => import(${
      JSON.stringify(Protocol.exampleId(file, index, version))
    }))`
  })
  return `import { test } from "vitest"\n${tests.join("\n")}\n`
}

/**
 * Creates a Vite plugin that transforms marked documentation examples into Vitest tests.
 *
 * **Details**
 *
 * Use Vitest's `includeSource` option to discover files containing `import.meta.vitest`. The plugin collects marked files through a collector module without executing the source module. Every example executes in its own module, with imports resolved relative to the original source file. Native in-source tests are not supported.
 *
 * @category testing
 * @since 4.0.0
 */
export const plugin = (): Plugin => {
  const byFile = new Map<string, ReadonlyArray<Source.Snippet>>()
  const cache = new Map<string, {
    readonly version: string | undefined
    readonly value: Promise<ReadonlyArray<Source.Snippet>>
  }>()
  let sourceExamples: Promise<typeof Source> | undefined

  const loadExamples = (
    file: string,
    version?: string | undefined
  ): Promise<ReadonlyArray<Source.Snippet>> => {
    const cached = cache.get(file)
    if (cached !== undefined && cached.version === version) return cached.value
    sourceExamples ??= import("./Source.ts")
    const loaded = sourceExamples.then((SourceExamples) =>
      SourceExamples.extractFile(file).then((examples) => {
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
    config(config) {
      const test: TestUserConfig = { runner: runnerModule(config) }
      return { test }
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
        if (loaded.kind === "collector") return collectorModule(loaded.file, examples, loaded.version)
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
