import * as path from "node:path"
import {
  Ambiguous,
  DeclarationTarget,
  type ExportRule,
  type ExportVariant,
  JavaScriptExportVariant,
  Missing,
  NotRequired,
  PackageExport,
  Resolved,
  ResourceExportVariant,
  type SourceProvenance
} from "../Model.ts"
import {
  flattenReachableTargets,
  resolutionConditions,
  selectPackageExport,
  substitutePatternTarget
} from "./PackageExports.ts"
import { implementationExtension, posixJoin, type SourceInventory, targetPathname } from "./Paths.ts"

interface ExpandPackageExportsOptions {
  readonly name: string
  readonly packagePath: string
  readonly sourceDirectory: string
  readonly distributionDirectory: string
  readonly packageType: "Module" | "CommonJS" | "Unspecified"
  readonly exportsMode: "Exports" | "Legacy"
  readonly main: string | undefined
  readonly types: string | undefined
  readonly rules: ReadonlyArray<ExportRule>
  readonly inventory: SourceInventory
}

const javascriptTarget = (target: string): boolean => {
  const pathname = targetPathname(target)
  return /\.(?:js|mjs|cjs)$/.test(pathname) || !path.posix.basename(pathname).includes(".")
}

const declarationTarget = (target: string): boolean => /\.d\.(?:ts|mts|cts)$/.test(targetPathname(target))

const inferredDeclarationPath = (distributionPath: string): string =>
  distributionPath.replace(
    /\.(mjs|cjs|js)$/,
    (_, extension) => extension === "mjs" ? ".d.mts" : extension === "cjs" ? ".d.cts" : ".d.ts"
  )

const format = (
  target: string,
  options: ExpandPackageExportsOptions
): "Module" | "CommonJS" | "Json" | "Native" | "Unknown" => {
  const pathname = targetPathname(target)
  if (pathname.endsWith(".mjs")) return "Module"
  if (pathname.endsWith(".cjs")) return "CommonJS"
  if (pathname.endsWith(".json")) return "Json"
  if (pathname.endsWith(".node")) return "Native"
  if (pathname.endsWith(".js") || !path.posix.basename(pathname).includes(".")) {
    let directory = path.posix.dirname(pathname)
    while (directory !== ".") {
      const packageType = options.inventory.packageTypes.get(directory)
      if (packageType !== undefined) return packageType === "Unspecified" ? "Unknown" : packageType
      directory = path.posix.dirname(directory)
    }
    return options.packageType === "Unspecified" ? "Unknown" : options.packageType
  }
  return "Unknown"
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

const modulePath = (target: string, distributionDirectory: string): string => {
  const pathname = targetPathname(target)
  const prefix = distributionDirectory.length === 0 ? "" : `${distributionDirectory}/`
  const relative = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname
  const extension = implementationExtension(relative)
  return extension === undefined ? relative : relative.slice(0, -extension.length)
}

const withinDistribution = (target: string, distributionDirectory: string): boolean =>
  distributionDirectory.length === 0 || targetPathname(target).startsWith(`${distributionDirectory}/`)

const provenance = (
  target: string,
  inventory: SourceInventory,
  distributionDirectory: string
): Resolved | Missing | Ambiguous => {
  const targetModulePath = modulePath(target, distributionDirectory)
  if (!withinDistribution(target, distributionDirectory)) return new Missing({ modulePath: targetModulePath })
  const sources = inventory.modules.get(targetModulePath)
  if (sources === undefined) return new Missing({ modulePath: targetModulePath })
  if (sources.length === 1) return new Resolved({ sourcePath: sources[0]! })
  return new Ambiguous({ modulePath: targetModulePath, candidates: [...sources] })
}

const selectedLeafAgrees = (
  rules: ReadonlyArray<ExportRule>,
  rule: ExportRule,
  subpath: string,
  target: string,
  conditionPath: ReadonlyArray<string>,
  fallbackPositions: ReadonlyArray<number>,
  mode: "Import" | "Require"
): boolean => {
  const selected = selectPackageExport(rules, subpath, resolutionConditions(conditionPath, mode))
  return selected._tag === "Resolved" && selected.rule === rule && selected.target === target &&
    selected.conditionPath.length === conditionPath.length &&
    selected.conditionPath.every((condition, index) => condition === conditionPath[index]) &&
    selected.fallbackPositions.length === fallbackPositions.length &&
    selected.fallbackPositions.every((position, index) => position === fallbackPositions[index])
}

const reachableMode = (
  rules: ReadonlyArray<ExportRule>,
  rule: ExportRule,
  subpath: string,
  target: string,
  conditionPath: ReadonlyArray<string>,
  fallbackPositions: ReadonlyArray<number>
): "Import" | "Require" | "Any" | undefined => {
  const imported = selectedLeafAgrees(rules, rule, subpath, target, conditionPath, fallbackPositions, "Import")
  const required = selectedLeafAgrees(rules, rule, subpath, target, conditionPath, fallbackPositions, "Require")
  return imported && required ? "Any" : imported ? "Import" : required ? "Require" : undefined
}

const specifier = (name: string, subpath: string): string => subpath === "." ? name : `${name}${subpath.slice(1)}`

const variant = (
  options: ExpandPackageExportsOptions,
  target: string,
  mode: "Import" | "Require" | "Any",
  conditionPath: ReadonlyArray<string> = [],
  fallbackPositions: ReadonlyArray<number> = [],
  sourceProvenance?: SourceProvenance
): ExportVariant => {
  const isJavaScript = javascriptTarget(target)
  const distributionPath = posixJoin(options.packagePath, targetPathname(target))
  if (isJavaScript) {
    return new JavaScriptExportVariant({
      distributionPath,
      kind: "JavaScript",
      resolutionMode: mode,
      format: format(target, options),
      conditionPath: [...conditionPath],
      fallbackPositions: [...fallbackPositions],
      provenance: sourceProvenance?._tag === "NotRequired"
        ? provenance(target, options.inventory, options.distributionDirectory)
        : sourceProvenance ?? provenance(target, options.inventory, options.distributionDirectory)
    })
  }
  const file = options.inventory.files.get(targetPathname(target))
  const resourceProvenance = file === undefined
    ? new NotRequired()
    : file.sources.length === 1
    ? new Resolved({ sourcePath: file.sources[0]! })
    : new Ambiguous({
      modulePath: modulePath(target, options.distributionDirectory),
      candidates: [...file.sources]
    })
  return new ResourceExportVariant({
    distributionPath,
    kind: "Resource",
    resolutionMode: mode,
    format: format(target, options),
    conditionPath: [...conditionPath],
    fallbackPositions: [...fallbackPositions],
    provenance: sourceProvenance?._tag === "Resolved" || sourceProvenance?._tag === "Ambiguous"
      ? sourceProvenance
      : resourceProvenance
  })
}

const expandExports = (options: ExpandPackageExportsOptions): ReadonlyArray<PackageExport> => {
  const grouped = new Map<string, {
    readonly rule: string
    readonly variants: Array<ExportVariant>
    readonly declarations: Array<DeclarationTarget>
  }>()
  const explicitDeclarations = new Set<string>()
  const pendingDeclarationPatterns: Array<{
    readonly rule: Extract<ExportRule, { readonly _tag: "PatternExportRule" }>
    readonly target: string
    readonly conditionPath: ReadonlyArray<string>
    readonly fallbackPositions: ReadonlyArray<number>
  }> = []
  const add = (rule: ExportRule, subpath: string, value: ExportVariant) => {
    const current = grouped.get(subpath)
    if (current === undefined) grouped.set(subpath, { rule: rule.subpath, variants: [value], declarations: [] })
    else current.variants.push(value)
  }
  const addDeclaration = (
    rule: ExportRule,
    subpath: string,
    distributionPath: string,
    conditionPath: ReadonlyArray<string>,
    fallbackPositions: ReadonlyArray<number>,
    explicit = false
  ) => {
    const current = grouped.get(subpath) ?? { rule: rule.subpath, variants: [], declarations: [] }
    if (!grouped.has(subpath)) grouped.set(subpath, current)
    if (explicit) {
      if (!explicitDeclarations.has(subpath)) current.declarations.length = 0
      explicitDeclarations.add(subpath)
    } else if (explicitDeclarations.has(subpath)) {
      return
    }
    if (
      !current.declarations.some((target) =>
        target.distributionPath === distributionPath &&
        target.conditionPath.join("\0") === conditionPath.join("\0") &&
        target.fallbackPositions.join("\0") === fallbackPositions.join("\0")
      )
    ) {
      current.declarations.push(
        new DeclarationTarget({
          distributionPath,
          conditionPath: [...conditionPath],
          fallbackPositions: [...fallbackPositions]
        })
      )
    }
  }

  for (const rule of options.rules) {
    for (const leaf of flattenReachableTargets(rule.target)) {
      if (rule._tag === "ExactExportRule") {
        if (declarationTarget(leaf.target)) {
          addDeclaration(
            rule,
            rule.subpath,
            posixJoin(options.packagePath, targetPathname(leaf.target)),
            leaf.conditionPath,
            leaf.fallbackPositions,
            true
          )
          continue
        }
        const mode = reachableMode(
          options.rules,
          rule,
          rule.subpath,
          leaf.target,
          leaf.conditionPath,
          leaf.fallbackPositions
        )
        if (mode === undefined) continue
        const value = variant(
          options,
          leaf.target,
          mode,
          leaf.conditionPath,
          leaf.fallbackPositions
        )
        add(
          rule,
          rule.subpath,
          value
        )
        if (value.kind === "JavaScript") {
          addDeclaration(
            rule,
            rule.subpath,
            inferredDeclarationPath(value.distributionPath),
            leaf.conditionPath,
            leaf.fallbackPositions
          )
        }
        continue
      }

      if (!leaf.target.includes("*")) continue
      const isJavaScript = javascriptTarget(leaf.target)
      const isDeclaration = declarationTarget(leaf.target)
      if (isDeclaration) {
        pendingDeclarationPatterns.push({
          rule,
          target: leaf.target,
          conditionPath: leaf.conditionPath,
          fallbackPositions: leaf.fallbackPositions
        })
        continue
      }
      if (isJavaScript && !withinDistribution(leaf.target, options.distributionDirectory)) continue
      const targetPattern = isJavaScript
        ? modulePath(leaf.target, options.distributionDirectory)
        : targetPathname(leaf.target)
      const candidates = isJavaScript ? options.inventory.modules.keys() : options.inventory.files.keys()
      for (const candidate of candidates) {
        const capture = invertPattern(targetPattern, candidate)
        if (capture === undefined) continue
        const subpath = rule.subpath.replaceAll("*", capture)
        const substituted = substitutePatternTarget(leaf.target, capture)
        if (substituted._tag === "Invalid") continue
        const mode = reachableMode(
          options.rules,
          rule,
          subpath,
          substituted.target,
          leaf.conditionPath,
          leaf.fallbackPositions
        )
        if (mode === undefined) continue
        const value = variant(
          options,
          substituted.target,
          mode,
          leaf.conditionPath,
          leaf.fallbackPositions,
          isJavaScript
            ? provenance(substituted.target, options.inventory, options.distributionDirectory)
            : undefined
        )
        add(
          rule,
          subpath,
          value
        )
        if (value.kind === "JavaScript") {
          addDeclaration(
            rule,
            subpath,
            inferredDeclarationPath(value.distributionPath),
            leaf.conditionPath,
            leaf.fallbackPositions
          )
        }
      }
    }
  }

  for (const pending of pendingDeclarationPatterns) {
    let matched = false
    for (const subpath of grouped.keys()) {
      const capture = invertPattern(pending.rule.subpath, subpath)
      if (capture === undefined) continue
      const substituted = substitutePatternTarget(pending.target, capture)
      if (substituted._tag === "Invalid") continue
      matched = true
      addDeclaration(
        pending.rule,
        subpath,
        posixJoin(options.packagePath, targetPathname(substituted.target)),
        pending.conditionPath,
        pending.fallbackPositions,
        true
      )
    }
    if (matched) continue
    const declarationPattern = modulePath(
      pending.target.replace(/\.d\.(?:ts|mts|cts)(?=[?#]|$)/, ".js"),
      options.distributionDirectory
    )
    for (const candidate of options.inventory.modules.keys()) {
      const capture = invertPattern(declarationPattern, candidate)
      if (capture === undefined) continue
      const subpath = pending.rule.subpath.replaceAll("*", capture)
      const substituted = substitutePatternTarget(pending.target, capture)
      if (substituted._tag === "Invalid") continue
      addDeclaration(
        pending.rule,
        subpath,
        posixJoin(options.packagePath, targetPathname(substituted.target)),
        pending.conditionPath,
        pending.fallbackPositions,
        true
      )
    }
  }

  return [...grouped].map(([subpath, materialization]) =>
    new PackageExport({
      specifier: specifier(options.name, subpath),
      subpath,
      rule: materialization.rule,
      variants: materialization.variants,
      ...(materialization.declarations.length === 0 ? {} : { declarations: materialization.declarations })
    })
  ).sort((a, b) => a.specifier < b.specifier ? -1 : a.specifier > b.specifier ? 1 : 0)
}

const normalizePackagePath = (value: string): string | undefined => {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "")
  if (normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")) return undefined
  const result = normalized.split("/").reduce<Array<string> | undefined>((segments, segment) => {
    if (segments === undefined) return undefined
    if (segment === "" || segment === ".") return segments
    if (segment === "..") return segments.length === 0 ? undefined : segments.slice(0, -1)
    segments.push(segment)
    return segments
  }, [])
  return result?.join("/")
}

const resolveFile = (inventory: SourceInventory, request: string): string | undefined => {
  for (const candidate of [request, `${request}.js`, `${request}.json`, `${request}.node`]) {
    if (inventory.files.has(candidate)) return candidate
  }
  return undefined
}

const resolveIndex = (inventory: SourceInventory, directory: string): string | undefined => {
  for (const extension of [".js", ".json", ".node"]) {
    const candidate = posixJoin(directory, `index${extension}`)
    if (inventory.files.has(candidate)) return candidate
  }
  return undefined
}

const resolveDirectory = (inventory: SourceInventory, directory: string): string | undefined => {
  const main = inventory.directoryMains.get(directory)
  if (main !== undefined) {
    const request = normalizePackagePath(posixJoin(directory, main))
    if (request !== undefined) {
      const resolved = resolveFile(inventory, request) ?? resolveIndex(inventory, request)
      if (resolved !== undefined) return resolved
    }
  }
  return resolveIndex(inventory, directory)
}

const resolveRequire = (inventory: SourceInventory, request: string): string | undefined =>
  resolveFile(inventory, request) ?? resolveDirectory(inventory, request)

const rootTarget = (
  inventory: SourceInventory,
  main: string | undefined
): { readonly target: string; readonly rule: "main" | "legacy" } | undefined => {
  if (main !== undefined) {
    const request = normalizePackagePath(main)
    if (request !== undefined) {
      const resolved = resolveFile(inventory, request) ?? resolveIndex(inventory, request)
      if (resolved !== undefined) return { target: resolved, rule: "main" }
    }
  }
  const fallback = resolveIndex(inventory, "")
  return fallback === undefined ? undefined : { target: fallback, rule: "legacy" }
}

const expandLegacy = (options: ExpandPackageExportsOptions): ReadonlyArray<PackageExport> => {
  const requests = new Set<string>()
  for (const file of options.inventory.files.keys()) {
    requests.add(file)
    if (/\.(?:js|json|node)$/.test(file)) requests.add(file.replace(/\.(?:js|json|node)$/, ""))
  }
  for (const file of options.inventory.files.keys()) {
    if (/\/index\.(?:js|json|node)$/.test(file)) requests.add(file.replace(/\/index\.(?:js|json|node)$/, ""))
  }
  for (const directory of options.inventory.directoryMains.keys()) requests.add(directory)

  const entries: Array<PackageExport> = []
  const root = rootTarget(options.inventory, options.main)
  if (root !== undefined) {
    const rootVariant = variant(options, `./${root.target}`, "Any")
    entries.push(
      new PackageExport({
        specifier: options.name,
        subpath: ".",
        rule: root.rule,
        variants: [rootVariant],
        declarations: rootVariant.kind === "JavaScript"
          ? [
            new DeclarationTarget({
              distributionPath: inferredDeclarationPath(rootVariant.distributionPath),
              conditionPath: [],
              fallbackPositions: []
            })
          ]
          : []
      })
    )
  }

  for (const request of [...requests].sort()) {
    if (request.length === 0) continue
    const importTarget = options.inventory.files.has(request) ? request : undefined
    const requireTarget = resolveRequire(options.inventory, request)
    if (importTarget === undefined && requireTarget === undefined) continue
    const variants = importTarget === requireTarget
      ? [variant(options, `./${importTarget}`, "Any")]
      : [
        ...(importTarget === undefined ? [] : [variant(options, `./${importTarget}`, "Import")]),
        ...(requireTarget === undefined ? [] : [variant(options, `./${requireTarget}`, "Require")])
      ]
    const declarations = variants.flatMap((value) =>
      value.kind === "JavaScript"
        ? [
          new DeclarationTarget({
            distributionPath: inferredDeclarationPath(value.distributionPath),
            conditionPath: [...value.conditionPath],
            fallbackPositions: [...value.fallbackPositions]
          })
        ]
        : []
    )
    entries.push(
      new PackageExport({
        specifier: `${options.name}/${request}`,
        subpath: `./${request}`,
        rule: "legacy",
        variants,
        ...(declarations.length === 0 ? {} : { declarations })
      })
    )
  }
  return entries.sort((a, b) => a.specifier < b.specifier ? -1 : a.specifier > b.specifier ? 1 : 0)
}

export const expandPackageExports = (options: ExpandPackageExportsOptions): ReadonlyArray<PackageExport> =>
  applyRootTypes(options, options.exportsMode === "Exports" ? expandExports(options) : expandLegacy(options))

const applyRootTypes = (
  options: ExpandPackageExportsOptions,
  entries: ReadonlyArray<PackageExport>
): ReadonlyArray<PackageExport> => {
  if (options.types === undefined) return entries
  const distributionPath = posixJoin(options.packagePath, targetPathname(options.types))
  const declaration = new DeclarationTarget({ distributionPath, conditionPath: ["types"], fallbackPositions: [] })
  const root = entries.find((entry) => entry.subpath === ".")
  if (root?.declarations?.some((declaration) => declaration.conditionPath.includes("types"))) return entries
  if (root === undefined) {
    return [
      ...entries,
      new PackageExport({
        specifier: options.name,
        subpath: ".",
        rule: options.exportsMode === "Legacy" ? "legacy" : ".",
        variants: [],
        declarations: [declaration]
      })
    ].sort((a, b) => a.specifier.localeCompare(b.specifier))
  }
  return entries.map((entry) =>
    entry === root
      ? new PackageExport({ ...entry, declarations: [declaration] })
      : entry
  )
}
