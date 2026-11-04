/**
 * Experimental Rolldown bundling that removes unused methods from Effect
 * service implementations.
 *
 * Rolldown only tree-shakes top-level statements and ES module namespace
 * members, so a provider object such as the `FileSystem` built by
 * `NodeFileSystem.layer` keeps every method, and every module-scope helper
 * those methods reference, even when the program only calls `readFile`.
 *
 * `bundle` runs two Rolldown builds. The first records every module after the
 * other plugins have transformed it, and an analysis computes which methods
 * are read from each service key. The second build deletes the properties of
 * provider object literals that no consumer can observe, and Rolldown's
 * statement-level shaker drops the helpers that only those properties used.
 *
 * The analysis is conservative. Any use of a service key it does not
 * recognise keeps every method of that service, and any API that hands a
 * whole Context or Fiber to untrusted code disables pruning entirely, since
 * inspecting either prints every service value. Trusted packages (`effect` and
 * the platform packages by default) are assumed to follow that contract
 * internally.
 *
 * @since 4.0.0
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { type InputOptions, type OutputChunk, type Plugin, rolldown } from "rolldown"
import { parseSync } from "rolldown/utils"
import { type Analysis, analyze, type Edit, type ModuleInput } from "./internal/analysis.ts"
import type { Node } from "./internal/scope.ts"

/**
 * Outcome of the service analysis for one bundle.
 *
 * @category models
 * @since 4.0.0
 */
export interface Report {
  /** Reasons the analysis disabled pruning for the whole bundle. */
  readonly globalBailouts: ReadonlyArray<string>
  /** Reasons individual service keys keep every method. */
  readonly keyBailouts: ReadonlyMap<string, ReadonlyArray<string>>
  /** Methods read from each service key, or `"all"`. */
  readonly demand: ReadonlyMap<string, ReadonlyArray<string> | "all">
  /** Removed provider properties, as `module:property`. */
  readonly removed: ReadonlyArray<string>
  /** Whether the pruned build was used. */
  readonly applied: boolean
}

/**
 * Options for {@link bundle}.
 *
 * @category models
 * @since 4.0.0
 */
export interface BundleOptions {
  /**
   * Package names whose modules may use Context and Fiber APIs internally
   * without disabling the optimization.
   */
  readonly trustedPackages?: ReadonlyArray<string> | undefined
  readonly onReport?: ((report: Report) => void) | undefined
}

const defaultTrustedPackages = [
  "effect",
  "@effect/platform-node",
  "@effect/platform-node-shared",
  "@effect/platform-bun",
  "@effect/platform-deno",
  "@effect/platform-browser"
]

interface Collected {
  readonly code: string
  readonly program: Node
  readonly comments: ModuleInput["comments"]
  readonly resolved: Map<string, string>
}

// The module type reflects earlier transforms, e.g. TypeScript already lowered to JavaScript.
const languageOf = (moduleType: string): "js" | "jsx" | "ts" | "tsx" =>
  /(?:^|\.)[cm]?tsx$/.test(moduleType)
    ? "tsx"
    : /(?:^|\.)[cm]?ts$/.test(moduleType)
    ? "ts"
    : /(?:^|\.)jsx$/.test(moduleType)
    ? "jsx"
    : "js"

const sourcesOf = (program: Node): Array<string> => {
  const sources: Array<string> = []
  const visit = (node: Node) => {
    if (
      (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration" ||
        node.type === "ExportAllDeclaration" || node.type === "ImportExpression") &&
      node.source?.type === "Literal" && typeof node.source.value === "string"
    ) {
      sources.push(node.source.value)
    }
    for (const key in node) {
      const value = node[key]
      if (Array.isArray(value)) {
        for (const item of value) if (item && typeof item.type === "string") visit(item)
      } else if (value && typeof value.type === "string") {
        visit(value)
      }
    }
  }
  visit(program)
  return sources
}

const packageNameOf = (() => {
  const cache = new Map<string, string | undefined>()
  const lookup = (dir: string): string | undefined => {
    if (cache.has(dir)) return cache.get(dir)
    let name: string | undefined
    const file = path.join(dir, "package.json")
    if (fs.existsSync(file)) {
      name = JSON.parse(fs.readFileSync(file, "utf8")).name
    } else {
      const parent = path.dirname(dir)
      name = parent === dir ? undefined : lookup(parent)
    }
    cache.set(dir, name)
    return name
  }
  return (id: string) => path.isAbsolute(id) ? lookup(path.dirname(id)) : undefined
})()

const applyEdits = (code: string, edits: ReadonlyArray<Edit>): string => {
  let out = code
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + out.slice(edit.end)
  }
  return out
}

const build = async (options: InputOptions, plugin: Plugin): Promise<OutputChunk> => {
  const bundle = await rolldown({ ...options, plugins: [options.plugins, plugin] })
  try {
    const { output } = await bundle.generate({ format: "esm" })
    return output[0]
  } finally {
    await bundle.close()
  }
}

/**
 * Bundles a single entrypoint as ESM and returns the generated code, removing
 * service methods the bundled program cannot observe.
 *
 * @category bundling
 * @since 4.0.0
 */
export const bundle = async (options: InputOptions, bundleOptions: BundleOptions = {}): Promise<string> => {
  const trusted = new Set(bundleOptions.trustedPackages ?? defaultTrustedPackages)
  const collected = new Map<string, Collected>()
  const parseFailures: Array<string> = []

  const collect: Plugin = {
    name: "effect-service-shaking:collect",
    transform: {
      order: "post",
      async handler(code, id, meta) {
        const parsed = parseSync(id, code, { lang: languageOf(meta.moduleType ?? id) })
        if (parsed.errors.length > 0) {
          parseFailures.push(`${id}: ${parsed.errors[0].message}`)
          return null
        }
        const resolved = new Map<string, string>()
        for (const source of sourcesOf(parsed.program as unknown as Node)) {
          const result = await this.resolve(source, id)
          if (result && !result.external) resolved.set(source, result.id)
        }
        collected.set(id, {
          code,
          program: parsed.program as unknown as Node,
          comments: parsed.comments,
          resolved
        })
        return null
      }
    }
  }
  const first = await build(options, collect)

  const report = (analysis: Pick<Report, "globalBailouts" | "keyBailouts" | "demand" | "removed">, applied: boolean) =>
    bundleOptions.onReport?.({ ...analysis, applied })

  if (parseFailures.length > 0) {
    report({ globalBailouts: parseFailures, keyBailouts: new Map(), demand: new Map(), removed: [] }, false)
    return first.code
  }

  const analysis: Analysis = analyze(
    [...collected].map(([id, module]) => ({
      id,
      ...module,
      isEntry: first.facadeModuleId === id,
      rendered: (first.modules[id]?.renderedLength ?? 0) > 0,
      trusted: trusted.has(packageNameOf(id) ?? "")
    }))
  )
  if (analysis.edits.size === 0) {
    report(analysis, false)
    return first.code
  }

  // Edits are offsets into the code seen in the first build. If any module
  // transforms differently the second time, the edits cannot be trusted.
  let mismatch = false
  const prune: Plugin = {
    name: "effect-service-shaking:prune",
    transform: {
      order: "post",
      handler(code, id) {
        const edits = analysis.edits.get(id)
        if (edits === undefined) return null
        if (collected.get(id)?.code !== code) {
          mismatch = true
          return null
        }
        return { code: applyEdits(code, edits) }
      }
    }
  }
  const second = await build(options, prune)
  report(analysis, !mismatch)
  return mismatch ? first.code : second.code
}
