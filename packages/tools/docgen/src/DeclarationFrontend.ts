/**
 * TypeScript declaration documentation frontend.
 *
 * @since 0.6.0
 */
import type * as Workspace from "@effect/workspace/Workspace"
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping"
import * as Effect from "effect/Effect"
import * as Glob from "glob"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as Configuration from "./Configuration.ts"
import * as Domain from "./Domain.ts"
import * as SemanticModel from "./SemanticModel.ts"

interface Manifest {
  readonly name?: unknown
  readonly types?: unknown
  readonly typings?: unknown
  readonly exports?: unknown
  readonly publishConfig?: { readonly exports?: unknown; readonly types?: unknown; readonly typings?: unknown } | null
}

interface Leaf {
  readonly target: string
  readonly conditions: ReadonlyArray<string>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const effective = (manifest: Manifest, field: "exports" | "types" | "typings"): unknown =>
  isRecord(manifest.publishConfig) && Object.hasOwn(manifest.publishConfig, field)
    ? manifest.publishConfig[field]
    : manifest[field]

const leaves = (value: unknown, conditions: ReadonlyArray<string> = []): ReadonlyArray<Leaf> => {
  if (typeof value === "string") return value.startsWith("./") ? [{ target: value, conditions }] : []
  if (Array.isArray(value)) {
    for (const entry of value) {
      const selected = leaves(entry, conditions)
      if (selected.length > 0) return selected
    }
    return []
  }
  if (!isRecord(value)) return []
  const active = new Set(["types", "import", "require", "node", "node-addons", "module-sync"])
  for (const [condition, target] of Object.entries(value)) {
    if (condition === "default" || active.has(condition)) {
      return leaves(target, [...conditions, condition])
    }
  }
  return []
}

const escapeRegExp = (value: string): string => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")

const invertPattern = (pattern: string, value: string): string | undefined => {
  const parts = pattern.split("*")
  if (parts.length === 1) return undefined
  let expression = `^${escapeRegExp(parts[0]!)}`
  for (let index = 1; index < parts.length; index++) {
    expression += index === 1 ? "(.+)" : "\\1"
    expression += escapeRegExp(parts[index]!)
  }
  return new RegExp(`${expression}$`).exec(value)?.[1]
}

const declarationTarget = (target: string): string | undefined => {
  const pathname = target.split(/[?#]/, 1)[0]!
  if (/\.d\.(?:ts|mts|cts)$/.test(pathname)) return pathname
  if (pathname.endsWith(".mjs")) return pathname.slice(0, -4) + ".d.mts"
  if (pathname.endsWith(".cjs")) return pathname.slice(0, -4) + ".d.cts"
  if (pathname.endsWith(".js")) return pathname.slice(0, -3) + ".d.ts"
  return undefined
}

const rules = (manifest: Manifest): ReadonlyArray<readonly [string, unknown]> => {
  const exports = effective(manifest, "exports")
  if (typeof exports === "string" || Array.isArray(exports)) return [[".", exports]]
  if (!isRecord(exports)) return []
  const entries = Object.entries(exports)
  return entries.some(([key]) => key.startsWith(".")) ? entries : [[".", exports]]
}

const modulePathFor = (subpath: string): [string, ...Array<string>] =>
  subpath === "." ? ["src", "index.ts"] : ["src", `${subpath.slice(2)}.ts`]

const specifierFor = (name: string, subpath: string): string => subpath === "." ? name : `${name}${subpath.slice(1)}`

const discover = Effect.fnUntraced(function*(root: string, manifest: Manifest, name: string) {
  const selected = new Map<string, Set<string>>()
  const add = (target: string, subpath: string) => {
    const absolute = path.resolve(root, target.replace(/^\.\//, ""))
    const specifiers = selected.get(absolute)
    if (specifiers === undefined) selected.set(absolute, new Set([specifierFor(name, subpath)]))
    else specifiers.add(specifierFor(name, subpath))
  }
  const rootTypes = effective(manifest, "types") ?? effective(manifest, "typings")
  for (const [subpath, target] of rules(manifest)) {
    const candidates = leaves(target)
    const explicit = candidates.filter((leaf) => /\.d\.(?:ts|mts|cts)(?:[?#]|$)/.test(leaf.target))
    const selected = explicit.length > 0
      ? explicit
      : subpath === "." && typeof rootTypes === "string"
      ? [{ target: rootTypes, conditions: ["types"] }]
      : candidates
    for (const leaf of selected) {
      const declaration = declarationTarget(leaf.target)
      if (declaration === undefined) continue
      if (subpath.includes("*") && declaration.includes("*")) {
        const pattern = declaration.replace(/^\.\//, "")
        const matches = yield* Effect.tryPromise({
          try: () => Glob.glob(pattern, { cwd: root, absolute: true }),
          catch: (cause) =>
            new Domain.DocgenError({
              message: `[declaration] Unable to expand '${subpath}' target '${leaf.target}': ${String(cause)}`
            })
        })
        for (const match of matches) {
          const relative = path.relative(root, match).split(path.sep).join("/")
          const capture = invertPattern(pattern, relative)
          if (capture === undefined) continue
          add(relative, subpath.replaceAll("*", capture))
        }
      } else if (!subpath.includes("*")) {
        add(declaration, subpath)
      }
    }
  }
  if (rules(manifest).every(([subpath]) => subpath !== ".") && typeof rootTypes === "string") add(rootTypes, ".")
  const bySpecifier = new Map<string, Array<string>>()
  for (const [file, specifiers] of selected) {
    for (const specifier of specifiers) {
      const targets = bySpecifier.get(specifier)
      if (targets === undefined) bySpecifier.set(specifier, [file])
      else targets.push(file)
    }
  }
  for (const [specifier, targets] of bySpecifier) {
    const distinct = [...new Set(targets)]
    if (distinct.length > 1) {
      return yield* new Domain.DocgenError({
        message: `[declaration] Package '${name}' public specifier '${specifier}' has ambiguous declaration targets: ${
          distinct.join(", ")
        }`
      })
    }
  }
  const files: Array<Domain.SourceFile> = []
  for (const [file, specifiers] of selected) {
    const exists = yield* Effect.promise(() => fs.stat(file).then(() => true, () => false))
    if (!exists) {
      return yield* new Domain.DocgenError({
        message: `[declaration] Package '${name}' public declaration target is missing: ${file}`
      })
    }
    const publicSpecifiers = [...specifiers].sort()
    const first = publicSpecifiers[0]!
    const subpath = first === name ? "." : `.${first.slice(name.length)}`
    const mapping = yield* declarationMapper(root, file)
    files.push(
      new Domain.SourceFile(
        file,
        modulePathFor(subpath),
        publicSpecifiers as [string, ...Array<string>],
        mapping.sourcePath ?? path.relative(root, file).split(path.sep).join("/"),
        name,
        mapping.mapPosition
      )
    )
  }
  return files.sort((a, b) => a.path.localeCompare(b.path))
})

const declarationMapper = Effect.fnUntraced(function*(root: string, declarationPath: string) {
  const declarationContent = yield* Effect.promise(() => fs.readFile(declarationPath, "utf8").catch(() => ""))
  const match = /\/\/# sourceMappingURL=(\S+)\s*$/.exec(declarationContent)
  const mapPath = match === null ? `${declarationPath}.map` : path.resolve(path.dirname(declarationPath), match[1])
  const mapContent = yield* Effect.promise(() => fs.readFile(mapPath, "utf8").catch(() => undefined))
  const fallback = (position: Domain.Position): Domain.Position => ({
    ...position,
    source: {
      path: path.relative(root, declarationPath).split(path.sep).join("/"),
      line: position.line,
      column: position.column,
      content: declarationContent,
      analyzedPath: declarationPath,
      analyzedLine: position.line,
      analyzedColumn: position.column,
      mapped: false
    }
  })
  if (mapContent === undefined) return { mapPosition: fallback, sourcePath: undefined }
  const map = yield* Effect.try(() => new TraceMap(mapContent, mapPath)).pipe(Effect.orElseSucceed(() => undefined))
  if (map === undefined) return { mapPosition: fallback, sourcePath: undefined }
  const contents = new Map<string, string | undefined>()
  const parsedMap: { readonly sourceRoot?: string; readonly sources?: ReadonlyArray<string> } = yield* Effect.try(() =>
    JSON.parse(mapContent) as {
      readonly sourceRoot?: string
      readonly sources?: ReadonlyArray<string>
      readonly sourcesContent?: ReadonlyArray<string | null>
    }
  ).pipe(Effect.orElseSucceed(() => ({})))
  const sourcesContent = (parsedMap as { readonly sourcesContent?: ReadonlyArray<string | null> }).sourcesContent
  for (let index = 0; index < (parsedMap.sources?.length ?? 0); index++) {
    const source = parsedMap.sources![index]!
    const originalPath = path.resolve(path.dirname(mapPath), parsedMap.sourceRoot ?? "", source)
    const embedded = sourcesContent?.[index]
    const content = embedded ?? (yield* Effect.promise(() => fs.readFile(originalPath, "utf8").catch(() => undefined)))
    contents.set(originalPath, content)
    contents.set(source, content)
  }
  const sourcePath = [...contents].find(([source, content]) => path.isAbsolute(source) && content !== undefined)?.[0]
  const mapPosition = (position: Domain.Position): Domain.Position => {
    const original = originalPositionFor(map, { line: position.line, column: position.column - 1 })
    if (original.source === null || original.line === null || original.column === null) {
      return fallback(position)
    }
    const originalPath = path.isAbsolute(original.source)
      ? original.source
      : path.resolve(path.dirname(mapPath), original.source)
    const content = contents.get(originalPath) ?? contents.get(original.source)
    if (content === undefined) return fallback(position)
    return {
      ...position,
      source: {
        path: path.relative(root, originalPath).split(path.sep).join("/"),
        line: original.line,
        column: original.column + 1,
        content,
        analyzedPath: declarationPath,
        analyzedLine: position.line,
        analyzedColumn: position.column,
        mapped: true
      }
    }
  }
  return {
    mapPosition,
    sourcePath: sourcePath === undefined ? undefined : path.relative(root, sourcePath).split(path.sep).join("/")
  }
})

/**
 * Analyzes one built, installed, or unpacked package from its shipped manifest.
 *
 * @category constructors
 * @since 0.6.0
 */
export const analyzePackage = Effect.fnUntraced(function*(root: string) {
  const manifest = yield* Effect.tryPromise({
    try: () => fs.readFile(path.join(root, "package.json"), "utf8").then((content) => JSON.parse(content) as Manifest),
    catch: (cause) =>
      new Domain.DocgenError({ message: `[declaration] Unable to read package manifest: ${String(cause)}` })
  })
  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    return yield* new Domain.DocgenError({ message: "[declaration] Package manifest field 'name' must be a string" })
  }
  const files = yield* discover(root, manifest, manifest.name)
  if (files.length === 0) {
    return yield* new Domain.DocgenError({
      message:
        `[declaration] Package '${manifest.name}' has no supported public declaration targets in 'exports', 'types', or 'typings'`
    })
  }
  return yield* SemanticModel.fromFiles(files, [{ name: manifest.name, root }], "declaration").pipe(
    Effect.mapError((errors) =>
      new Domain.DocgenError({
        message: `[declaration] Unable to analyze package '${manifest.name}':\n${errors.join("\n")}`
      })
    )
  )
})

/**
 * Analyzes built declarations selected from a workspace's effective published surface.
 *
 * @category constructors
 * @since 0.6.0
 */
export const analyzeWorkspace = Effect.fnUntraced(function*(
  analysis: Workspace.WorkspaceAnalysis,
  filters: { readonly packages?: ReadonlyArray<string>; readonly paths?: ReadonlyArray<string> } = {}
) {
  const config = yield* Configuration.Configuration
  const packages: Array<{ readonly name: string; readonly root: string }> = []
  const files: Array<Domain.SourceFile> = []
  const excluded = new Set(
    config.exclude.length === 0 ? [] : yield* Effect.tryPromise({
      try: () => Glob.glob(config.exclude.slice(), { cwd: analysis.root, absolute: true }),
      catch: (cause) =>
        new Domain.DocgenError({ message: `[declaration] Unable to apply exclusions: ${String(cause)}` })
    })
  )
  const packageFilters = filters.packages?.map((value) => value.toLowerCase()) ?? []
  const pathFilters = filters.paths?.map((value) => value.toLowerCase()) ?? []
  for (const pkg of analysis.workspace.packages) {
    const slug = pkg.name.replace(/^@effect\//, "").replace(/^@/, "").replaceAll("/", "-").toLowerCase()
    if (packageFilters.length > 0 && !packageFilters.some((value) => slug.includes(value))) continue
    const root = path.resolve(analysis.root, pkg.path)
    packages.push({ name: pkg.name, root })
    const selected = new Map<string, Set<string>>()
    for (const entry of pkg.distribution.exports) {
      for (const target of entry.declarations ?? []) {
        const absolute = path.resolve(analysis.root, target.distributionPath)
        const specifiers = selected.get(absolute)
        if (specifiers === undefined) selected.set(absolute, new Set([entry.specifier]))
        else specifiers.add(entry.specifier)
      }
    }
    for (const [file, specifierSet] of selected) {
      const exists = yield* Effect.promise(() => fs.stat(file).then(() => true, () => false))
      if (!exists) {
        return yield* new Domain.DocgenError({
          message: `[declaration] Package '${pkg.name}' public declaration target is missing: ${file}`
        })
      }
      const specifiers = [...specifierSet].sort() as [string, ...Array<string>]
      const sourcePath = pkg.distribution.exports.flatMap((entry) =>
        entry.specifier === specifiers[0]
          ? entry.variants.flatMap((variant) =>
            variant.kind === "JavaScript" && variant.provenance._tag === "Resolved"
              ? [variant.provenance.sourcePath]
              : []
          )
          : []
      ).at(0)
      if (excluded.has(file) || (sourcePath !== undefined && excluded.has(path.resolve(analysis.root, sourcePath)))) {
        continue
      }
      const modulePath = sourcePath === undefined
        ? modulePathFor(specifiers[0] === pkg.name ? "." : `.${specifiers[0].slice(pkg.name.length)}`)
        : sourcePath.slice(pkg.path.length + 1).split("/") as [string, ...Array<string>]
      if (
        pathFilters.length > 0 &&
        !pathFilters.some((value) =>
          sourcePath?.toLowerCase().includes(value) ||
          path.relative(analysis.root, file).split(path.sep).join("/").toLowerCase().includes(value) ||
          specifiers.some((specifier) => specifier.toLowerCase().includes(value))
        )
      ) continue
      const mapping = yield* declarationMapper(analysis.root, file)
      const declarationPath = path.relative(analysis.root, file).split(path.sep).join("/")
      files.push(
        new Domain.SourceFile(
          file,
          modulePath,
          specifiers,
          sourcePath ?? mapping.sourcePath ?? declarationPath,
          pkg.name,
          mapping.mapPosition
        )
      )
    }
  }
  const selectedPackageNames = new Set(files.map((file) => file.packageName))
  const selectedPackages = packages.filter((pkg) => selectedPackageNames.has(pkg.name))
  if (selectedPackages.length === 0) {
    return yield* new Domain.DocgenError({ message: "No documentation declarations matched the supplied filters" })
  }
  return yield* SemanticModel.fromFiles(files, selectedPackages, "declaration").pipe(
    Effect.mapError((errors) =>
      new Domain.DocgenError({ message: `[declaration] Unable to analyze workspace:\n${errors.join("\n")}` })
    )
  )
})
