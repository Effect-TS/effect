import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import type { Entrypoint } from "./Model.ts"

interface PackageManifest {
  readonly name?: string
  readonly private?: boolean
  readonly exports?: unknown
  readonly publishConfig?: {
    readonly exports?: unknown
  }
}

interface PackageInfo {
  readonly name: string
  readonly root: string
  readonly manifest: PackageManifest
  readonly declarationRoot: string
  readonly exports: unknown
}

const readManifest = (path: string): PackageManifest => JSON.parse(readFileSync(path, "utf8"))

const walk = (root: string, predicate: (path: string) => boolean): ReadonlyArray<string> => {
  const output: Array<string> = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue
      }
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(path)
      } else if (predicate(path)) {
        output.push(path)
      }
    }
  }
  if (existsSync(root)) {
    visit(root)
  }
  return output.sort()
}

const packagesIn = (repoRoot: string): ReadonlyArray<PackageInfo> =>
  walk(join(repoRoot, "packages"), (path) => path.endsWith(`${sep}package.json`))
    .map((path): PackageInfo | undefined => {
      const sourceRoot = dirname(path)
      const packedPath = join(sourceRoot, "dist", "package.json")
      const packed = existsSync(packedPath)
      const manifest = readManifest(packed ? packedPath : path)
      if (manifest.name === undefined || manifest.private === true) {
        return undefined
      }
      return {
        name: manifest.name,
        root: packed ? join(sourceRoot, "dist") : sourceRoot,
        declarationRoot: packed ? join(sourceRoot, "dist") : join(sourceRoot, "dist"),
        exports: packed ? manifest.exports : (manifest.publishConfig?.exports ?? manifest.exports),
        manifest
      }
    })
    .filter((entry): entry is PackageInfo => entry !== undefined)
    .sort((left, right) => right.name.length - left.name.length)

const exportedTarget = (value: unknown): string | null | undefined => {
  if (value === null || typeof value === "string") {
    return value
  }
  if (typeof value !== "object" || value === null) {
    return undefined
  }
  for (const condition of ["types", "import", "default", "node", "browser"]) {
    const target = exportedTarget(Reflect.get(value, condition))
    if (target !== undefined) {
      return target
    }
  }
  return undefined
}

const matchPattern = (pattern: string, value: string): string | undefined => {
  const star = pattern.indexOf("*")
  if (star === -1) {
    return pattern === value ? "" : undefined
  }
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  return value.startsWith(prefix) && value.endsWith(suffix)
    ? value.slice(prefix.length, value.length - suffix.length)
    : undefined
}

const moduleParts = (module: string, packages: ReadonlyArray<PackageInfo>): {
  readonly packageInfo: PackageInfo
  readonly key: string
} | undefined => {
  const packageInfo = packages.find((entry) => module === entry.name || module.startsWith(`${entry.name}/`))
  if (packageInfo === undefined) {
    return undefined
  }
  return {
    packageInfo,
    key: module === packageInfo.name ? "." : `.${module.slice(packageInfo.name.length)}`
  }
}

const targetToDeclaration = (packageInfo: PackageInfo, target: string): string => {
  const relativeTarget = target.replace(/^\.\//, "")
  const declaration = relativeTarget.endsWith(".d.ts")
    ? relativeTarget
    : relativeTarget.replace(/\.(?:mjs|cjs|js|mts|cts|ts)$/, ".d.ts")
  return resolve(packageInfo.root, declaration)
}

const expandPattern = (
  packageInfo: PackageInfo,
  keyPattern: string,
  targetPattern: string,
  requested: ReadonlySet<string>
): ReadonlyArray<Entrypoint> => {
  const candidates = walk(packageInfo.declarationRoot, (path) => path.endsWith(".d.ts"))
  const targetNormalized = targetPattern.endsWith(".d.ts")
    ? targetPattern
    : targetPattern.replace(/\.(?:mjs|cjs|js|mts|cts|ts)$/, ".d.ts")
  const entries: Array<Entrypoint> = []
  for (const declarationFile of candidates) {
    const relativeFile = `./${relative(packageInfo.root, declarationFile).split(sep).join("/")}`
    const capture = matchPattern(targetNormalized, relativeFile)
    if (capture === undefined) {
      continue
    }
    const key = keyPattern.replace("*", capture)
    const module = key === "." ? packageInfo.name : `${packageInfo.name}${key.slice(1)}`
    if (requested.has(module)) {
      entries.push({ packageName: packageInfo.name, module, declarationFile })
    }
  }
  return entries
}

export const discoverEntrypoints = (
  repoRoot: string,
  requestedModules: ReadonlyArray<string>
): { readonly entrypoints: ReadonlyArray<Entrypoint>; readonly missing: ReadonlyArray<string> } => {
  const packages = packagesIn(repoRoot)
  const requested = new Set(requestedModules)
  const output = new Map<string, Entrypoint>()

  for (const module of requested) {
    const parts = moduleParts(module, packages)
    if (parts === undefined || typeof parts.packageInfo.exports !== "object" || parts.packageInfo.exports === null) {
      continue
    }
    const exportsMap = parts.packageInfo.exports as Record<string, unknown>
    const exact = Object.prototype.hasOwnProperty.call(exportsMap, parts.key)
      ? exportedTarget(exportsMap[parts.key])
      : undefined
    if (typeof exact === "string") {
      const declarationFile = targetToDeclaration(parts.packageInfo, exact)
      if (existsSync(declarationFile) && statSync(declarationFile).isFile()) {
        output.set(module, { packageName: parts.packageInfo.name, module, declarationFile })
      }
      continue
    }
    if (exact === null) {
      continue
    }
    for (const [keyPattern, rawTarget] of Object.entries(exportsMap)) {
      if (!keyPattern.includes("*")) {
        continue
      }
      const capture = matchPattern(keyPattern, parts.key)
      const target = exportedTarget(rawTarget)
      if (capture === undefined || typeof target !== "string") {
        continue
      }
      const exclusions = Object.entries(exportsMap).some(([excludedKey, excludedTarget]) =>
        excludedTarget === null && matchPattern(excludedKey, parts.key) !== undefined
      )
      if (exclusions) {
        continue
      }
      if (target.includes("*")) {
        const declarationFile = targetToDeclaration(parts.packageInfo, target.replace("*", capture))
        if (existsSync(declarationFile)) {
          output.set(module, { packageName: parts.packageInfo.name, module, declarationFile })
        }
      }
    }
  }

  for (const packageInfo of packages) {
    if (typeof packageInfo.exports !== "object" || packageInfo.exports === null) {
      continue
    }
    for (const [keyPattern, rawTarget] of Object.entries(packageInfo.exports as Record<string, unknown>)) {
      const target = exportedTarget(rawTarget)
      if (keyPattern.includes("*") && typeof target === "string" && target.includes("*")) {
        for (const entry of expandPattern(packageInfo, keyPattern, target, requested)) {
          if (!output.has(entry.module)) {
            output.set(entry.module, entry)
          }
        }
      }
    }
  }

  return {
    entrypoints: [...output.values()].sort((left, right) => left.module.localeCompare(right.module)),
    missing: requestedModules.filter((module) => !output.has(module)).sort()
  }
}
