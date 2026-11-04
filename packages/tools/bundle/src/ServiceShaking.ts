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
 * recognise keeps every method of that service. Because inspecting a whole
 * Context or Fiber prints every service value, untrusted code may only use an
 * audited list of trusted APIs; anything else disables pruning entirely.
 * Trusted packages (`effect` and the platform packages by default) are assumed
 * not to inspect service values or hand out a Context or Fiber internally.
 * The code of trusted packages is not checked against that assumption.
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

interface PackageInfo {
  readonly name: string
  readonly root: string
}

const packageOf = (() => {
  const cache = new Map<string, PackageInfo | undefined>()
  const lookup = (dir: string): PackageInfo | undefined => {
    if (cache.has(dir)) return cache.get(dir)
    let info: PackageInfo | undefined
    const file = path.join(dir, "package.json")
    if (fs.existsSync(file)) {
      info = { name: JSON.parse(fs.readFileSync(file, "utf8")).name, root: dir }
    } else {
      const parent = path.dirname(dir)
      info = parent === dir ? undefined : lookup(parent)
    }
    cache.set(dir, info)
    return info
  }
  return (id: string) => path.isAbsolute(id) ? lookup(path.dirname(id)) : undefined
})()

// How a trusted module's exports are named in the analysis allow-list:
// `Effect.map` for the effect package, `@effect/platform-node/NodeRuntime.runMain` otherwise.
const apiPrefixOf = (id: string, info: PackageInfo): string => {
  const module = path.relative(info.root, id).split(path.sep).join("/")
    .replace(/^(?:src|dist)\//, "")
    .replace(/\.[cm]?[jt]sx?$/, "")
  return info.name === "effect" ? module : `${info.name}/${module}`
}

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

  const trustOf = (id: string) => {
    const info = packageOf(id)
    return info !== undefined && trusted.has(info.name)
      ? { trusted: true, apiPrefix: apiPrefixOf(id, info) }
      : { trusted: false }
  }
  const analysis: Analysis = analyze(
    [...collected].map(([id, module]) => ({
      id,
      ...module,
      isEntry: first.facadeModuleId === id,
      rendered: (first.modules[id]?.renderedLength ?? 0) > 0,
      ...trustOf(id)
    }))
  )
  if (analysis.edits.size === 0) {
    report(analysis, false)
    return first.code
  }

  // Edits are offsets into the code seen in the first build, and demand was
  // computed from every module of that build. If any module transforms
  // differently the second time, neither can be trusted.
  let mismatch = false
  const seen = new Set<string>()
  const prune: Plugin = {
    name: "effect-service-shaking:prune",
    transform: {
      order: "post",
      handler(code, id) {
        seen.add(id)
        if (collected.get(id)?.code !== code) {
          mismatch = true
          return null
        }
        const edits = analysis.edits.get(id)
        return edits === undefined ? null : { code: applyEdits(code, edits) }
      }
    }
  }
  const second = await build(options, prune)
  if (seen.size !== collected.size) mismatch = true
  report(analysis, !mismatch)
  return mismatch ? first.code : second.code
}
