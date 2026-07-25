/**
 * Authoritative pnpm Workspace analysis.
 *
 * @since 4.0.0
 */
import { getPackages, PackageJsonMissingNameError } from "@manypkg/get-packages"
import * as Effect from "effect/Effect"
import globby from "globby"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { sync as readYamlFile } from "read-yaml-file"
import { decodePackageExports } from "./internal/PackageExports.ts"
import { inventorySourceFiles, type SourceInventory } from "./internal/Paths.ts"
import { expandPackageExports } from "./internal/ReverseExpansion.ts"
import {
  Distribution,
  DuplicatePackageName,
  type ExportRule,
  InvalidPackageName,
  InvalidPackageVersion,
  InvalidWorkspaceDirectory,
  MalformedExports,
  PackageManifestUnavailable,
  PublishablePackage,
  type StructuralDiagnostic,
  Workspace,
  WorkspaceAnalysisError,
  WorkspaceMembershipUnavailable,
  WorkspaceRootNotFound
} from "./Model.ts"

/**
 * Options controlling Workspace Analysis.
 *
 * @category models
 * @since 4.0.0
 */
export interface AnalyzeOptions {
  readonly cwd?: string
  readonly sourceDirectory?: string
  readonly distributionDirectory?: string
}

/**
 * An absolute Workspace Root alongside its portable semantic model.
 *
 * @category models
 * @since 4.0.0
 */
export interface WorkspaceAnalysis {
  readonly root: string
  readonly workspace: Workspace
}

interface ResolvedAnalyzeOptions {
  readonly cwd: string
  readonly sourceDirectory: string
  readonly distributionDirectory: string
}

interface Manifest {
  readonly name?: unknown
  readonly version?: unknown
  readonly private?: unknown
  readonly exports?: unknown
  readonly main?: unknown
  readonly type?: unknown
  readonly types?: unknown
  readonly typings?: unknown
  readonly publishConfig?: {
    readonly exports?: unknown
    readonly main?: unknown
    readonly type?: unknown
    readonly types?: unknown
    readonly typings?: unknown
  } | null
}

interface DistributionManifest {
  readonly packageType: "Module" | "CommonJS" | "Unspecified"
  readonly main: string | undefined
  readonly exportsMode: "Exports" | "Legacy"
  readonly exports: unknown
  readonly types: string | undefined
}

interface Member {
  readonly manifest: Manifest
  readonly path: string
}

interface MemberInspection {
  readonly decodedRules: Map<string, ReadonlyArray<ExportRule>>
  readonly diagnostics: ReadonlyArray<StructuralDiagnostic>
}

type RecoveredMember =
  | { readonly _tag: "Member"; readonly member: Member }
  | { readonly _tag: "Unavailable"; readonly diagnostic: PackageManifestUnavailable }
  | { readonly _tag: "Missing" }

const messageOf = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause)

const isMissingFile = (cause: unknown): boolean => cause instanceof Error && "code" in cause && cause.code === "ENOENT"

const portablePath = (root: string, target: string): string => path.relative(root, target).split(path.sep).join("/")

const effectiveField = (
  manifest: Manifest,
  field: "exports" | "main" | "type" | "types" | "typings"
): unknown => {
  const publishConfig = manifest.publishConfig
  return publishConfig !== null && typeof publishConfig === "object" && Object.hasOwn(publishConfig, field)
    ? publishConfig[field]
    : manifest[field]
}

const distributionManifest = (manifest: Manifest): DistributionManifest => {
  const type = effectiveField(manifest, "type")
  const main = effectiveField(manifest, "main")
  const exports = effectiveField(manifest, "exports")
  const types = effectiveField(manifest, "types") ?? effectiveField(manifest, "typings")
  return {
    packageType: type === "module" ? "Module" : type === "commonjs" ? "CommonJS" : "Unspecified",
    main: typeof main === "string" ? main : undefined,
    exportsMode: exports === null || exports === undefined ? "Legacy" : "Exports",
    exports,
    types: typeof types === "string" ? types : undefined
  }
}

const normalizeDirectory = (directory: string): string => {
  const normalized = path.posix.normalize(directory.replaceAll("\\", "/"))
  return normalized === "." ? "" : normalized.replace(/^\.\//, "").replace(/\/$/, "")
}

const invalidDirectory = (directory: string): boolean =>
  path.posix.isAbsolute(directory) || /^[A-Za-z]:\//.test(directory) || directory === ".." ||
  directory.startsWith("../")

const resolveOptions = (options: AnalyzeOptions | undefined): ResolvedAnalyzeOptions => ({
  cwd: options?.cwd ?? process.cwd(),
  sourceDirectory: normalizeDirectory(options?.sourceDirectory ?? "src"),
  distributionDirectory: normalizeDirectory(options?.distributionDirectory ?? "dist")
})

const discoveryError = (root: string, cause: unknown): WorkspaceAnalysisError => {
  if (cause instanceof PackageJsonMissingNameError) {
    return new WorkspaceAnalysisError({
      diagnostics: cause.directories.map((manifestPath) =>
        new InvalidPackageName({
          packagePath: manifestPath.replaceAll("\\", "/").replace(/(?:^|\/)package\.json$/, "")
        })
      )
    })
  }
  const manifestPath = cause instanceof Error ? /^(.+?package\.json):/.exec(cause.message)?.[1] : undefined
  if (manifestPath !== undefined) {
    const packagePath = portablePath(root, path.dirname(manifestPath))
    if (packagePath.length > 0 && !packagePath.startsWith("../")) {
      return new WorkspaceAnalysisError({
        diagnostics: [new PackageManifestUnavailable({ packagePath, message: messageOf(cause) })]
      })
    }
  }
  return new WorkspaceAnalysisError({
    diagnostics: [new WorkspaceMembershipUnavailable({ root, message: messageOf(cause) })]
  })
}

const findWorkspaceRoot = Effect.fnUntraced(function*(cwd: string) {
  let current = path.resolve(cwd)
  while (true) {
    const found = yield* Effect.tryPromise({
      try: () => fs.access(path.join(current, "pnpm-workspace.yaml")).then(() => true),
      catch: () => false
    }).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }))
    if (found) return current
    const parent = path.dirname(current)
    if (parent === current) {
      return yield* Effect.fail(
        new WorkspaceAnalysisError({ diagnostics: [new WorkspaceRootNotFound({ cwd })] })
      )
    }
    current = parent
  }
})

const fail = (diagnostics: ReadonlyArray<StructuralDiagnostic>) =>
  Effect.fail(new WorkspaceAnalysisError({ diagnostics: [...diagnostics] }))

const inspectMembers = (members: ReadonlyArray<Member>): MemberInspection => {
  const identityDiagnostics: Array<StructuralDiagnostic> = []
  const names = new Map<string, Array<string>>()
  for (const member of members) {
    const name = member.manifest.name
    if (typeof name !== "string" || name.length === 0) {
      identityDiagnostics.push(new InvalidPackageName({ packagePath: member.path }))
      continue
    }
    const packagePaths = names.get(name)
    if (packagePaths === undefined) {
      names.set(name, [member.path])
    } else {
      packagePaths.push(member.path)
    }
  }
  for (const [name, packagePaths] of names) {
    if (packagePaths.length > 1) {
      identityDiagnostics.push(new DuplicatePackageName({ name, packagePaths }))
    }
  }

  const packageDiagnostics: Array<StructuralDiagnostic> = []
  for (const member of members) {
    if (
      (typeof member.manifest.version !== "string" || member.manifest.version.length === 0) &&
      typeof member.manifest.name === "string" && member.manifest.name.length > 0
    ) {
      packageDiagnostics.push(
        new InvalidPackageVersion({
          name: member.manifest.name,
          packagePath: member.path
        })
      )
    }
  }

  const decodedRules = new Map<string, ReadonlyArray<ExportRule>>()
  for (const member of members) {
    if (typeof member.manifest.name !== "string" || member.manifest.name.length === 0) continue
    const distribution = distributionManifest(member.manifest)
    if (distribution.exportsMode === "Legacy") {
      decodedRules.set(member.path, [])
      continue
    }
    const decoded = decodePackageExports(distribution.exports)
    if (decoded._tag === "Failure") {
      packageDiagnostics.push(
        new MalformedExports({
          name: member.manifest.name,
          packagePath: member.path,
          message: decoded.message
        })
      )
    } else {
      decodedRules.set(member.path, decoded.rules)
    }
  }

  return {
    decodedRules,
    diagnostics: [...identityDiagnostics, ...packageDiagnostics]
  }
}

const readRecoveredMember = (root: string, packagePath: string): Promise<RecoveredMember> =>
  fs.readFile(path.join(root, packagePath, "package.json"), "utf8").then(
    (contents) => ({
      _tag: "Member" as const,
      member: { manifest: JSON.parse(contents) as Manifest, path: packagePath }
    })
  ).catch((cause): RecoveredMember =>
    isMissingFile(cause)
      ? { _tag: "Missing" }
      : {
        _tag: "Unavailable",
        diagnostic: new PackageManifestUnavailable({ packagePath, message: messageOf(cause) })
      }
  )

const recoverMembers = Effect.fnUntraced(function*(root: string) {
  const recovery = yield* Effect.result(Effect.tryPromise({
    try: () =>
      Promise.resolve().then(() =>
        readYamlFile<{ readonly packages?: unknown }>(path.join(root, "pnpm-workspace.yaml"))
      ).then((manifest) => {
        const patterns = manifest.packages
        if (!Array.isArray(patterns) || !patterns.every((pattern) => typeof pattern === "string")) {
          return undefined
        }
        return globby(patterns, {
          cwd: root,
          onlyDirectories: true,
          expandDirectories: false,
          ignore: ["**/node_modules"]
        }).then((packagePaths) =>
          Promise.all(packagePaths.sort().map((packagePath) => readRecoveredMember(root, packagePath)))
        )
      }),
    catch: () => false as const
  }))

  if (recovery._tag === "Failure") return undefined
  const recovered = recovery.success
  if (recovered === undefined) return undefined
  const unavailable = recovered.flatMap((result) => result._tag === "Unavailable" ? [result.diagnostic] : [])
  const members = recovered.flatMap((result) =>
    result._tag === "Member" && result.member.manifest.private !== true
      ? [result.member]
      : []
  )
  const diagnostics = [...unavailable, ...inspectMembers(members).diagnostics]
  if (diagnostics.length > 0) return yield* fail(diagnostics)
  return members
})

const discover = Effect.fnUntraced(function*(root: string) {
  const discovered = yield* Effect.result(Effect.tryPromise({
    try: () => getPackages(root),
    catch: (cause) => ({ cause })
  }))
  if (discovered._tag === "Success") {
    if (discovered.success.tool !== "pnpm") {
      return yield* fail([
        new WorkspaceMembershipUnavailable({ root, message: "pnpm-workspace.yaml did not establish membership" })
      ])
    }
    return discovered.success.packages.flatMap((member) => {
      const manifest = member.packageJson as Manifest
      return manifest.private === true ? [] : [{ manifest, path: portablePath(root, member.dir) }]
    })
  }

  const recovered = yield* recoverMembers(root)
  if (recovered !== undefined) return recovered
  return yield* Effect.fail(discoveryError(root, discovered.failure.cause))
})

/**
 * Analyzes the authoritative pnpm Workspace containing the requested directory.
 *
 * @category constructors
 * @since 4.0.0
 */
export const analyze: (
  options?: AnalyzeOptions
) => Effect.Effect<WorkspaceAnalysis, WorkspaceAnalysisError> = Effect.fnUntraced(function*(options) {
  const resolved = resolveOptions(options)
  const directoryDiagnostics: Array<InvalidWorkspaceDirectory> = []
  if (invalidDirectory(resolved.sourceDirectory)) {
    directoryDiagnostics.push(
      new InvalidWorkspaceDirectory({
        option: "sourceDirectory",
        value: options?.sourceDirectory ?? resolved.sourceDirectory
      })
    )
  }
  if (invalidDirectory(resolved.distributionDirectory)) {
    directoryDiagnostics.push(
      new InvalidWorkspaceDirectory({
        option: "distributionDirectory",
        value: options?.distributionDirectory ?? resolved.distributionDirectory
      })
    )
  }
  if (directoryDiagnostics.length > 0) return yield* fail(directoryDiagnostics)
  const root = yield* findWorkspaceRoot(resolved.cwd)
  const members = (yield* discover(root)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

  const { decodedRules, diagnostics } = inspectMembers(members)
  if (diagnostics.length > 0) {
    return yield* fail(diagnostics)
  }

  const inventories = new Map<string, SourceInventory>()
  for (const member of members) {
    inventories.set(
      member.path,
      yield* inventorySourceFiles(root, member.path, resolved.sourceDirectory, resolved.distributionDirectory)
    )
  }

  return {
    root,
    workspace: new Workspace({
      packages: members.map((member) => {
        const name = member.manifest.name as string
        const manifest = distributionManifest(member.manifest)
        return new PublishablePackage({
          name,
          version: member.manifest.version as string,
          path: member.path,
          distribution: new Distribution({
            packageType: manifest.packageType,
            main: manifest.main,
            exportsMode: manifest.exportsMode,
            rules: decodedRules.get(member.path) ?? [],
            exports: expandPackageExports({
              name,
              packagePath: member.path,
              sourceDirectory: resolved.sourceDirectory,
              distributionDirectory: resolved.distributionDirectory,
              packageType: manifest.packageType,
              exportsMode: manifest.exportsMode,
              main: manifest.main,
              types: manifest.types,
              rules: decodedRules.get(member.path) ?? [],
              inventory: inventories.get(member.path)!
            })
          })
        })
      })
    })
  }
})
