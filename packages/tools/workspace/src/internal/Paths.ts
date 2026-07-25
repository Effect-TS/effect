import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { Dirent } from "node:fs"
import * as fs from "node:fs/promises"
import * as path from "node:path"

const implementationExtensions = [".tsx", ".mts", ".cts", ".jsx", ".mjs", ".cjs", ".ts", ".js"] as const

export interface ExpectedDistributionFile {
  readonly path: string
  readonly sources: ReadonlyArray<string>
}

export interface SourceInventory {
  readonly files: ReadonlyMap<string, ExpectedDistributionFile>
  readonly modules: ReadonlyMap<string, ReadonlyArray<string>>
  readonly directoryMains: ReadonlyMap<string, string>
  readonly packageTypes: ReadonlyMap<string, "Module" | "CommonJS" | "Unspecified">
}

export const posixJoin = (...parts: ReadonlyArray<string>): string => path.posix.join(...parts)

export const stripPackageTarget = (target: string): string => target.startsWith("./") ? target.slice(2) : target

export const targetPathname = (target: string): string =>
  stripPackageTarget(target).split(/[?#]/, 1)[0]!.replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
    const bytes = encoded.match(/[0-9a-f]{2}/gi)!.map((byte) => Number.parseInt(byte, 16))
    return new TextDecoder().decode(Uint8Array.from(bytes))
  })

export const implementationExtension = (file: string): string | undefined => {
  if (/\.d\.(?:ts|mts|cts)$/.test(file)) return undefined
  return implementationExtensions.find((extension) => file.endsWith(extension))
}

const projectedFile = (file: string): string | undefined => {
  if (/\.d\.(?:ts|mts|cts)$/.test(file)) return undefined
  if (/\.(?:ts|tsx|js|jsx)$/.test(file)) return file.replace(/\.(?:ts|tsx|js|jsx)$/, ".js")
  if (/\.(?:mts|mjs)$/.test(file)) return file.replace(/\.(?:mts|mjs)$/, ".mjs")
  if (/\.(?:cts|cjs)$/.test(file)) return file.replace(/\.(?:cts|cjs)$/, ".cjs")
  return file
}

const isMissingDirectory = (cause: unknown): boolean =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT"

const walk: (directory: string, relative?: string, excluded?: string) => Effect.Effect<Array<string>> = Effect
  .fnUntraced(
    function*(directory, relative = "", excluded) {
      const entries: Array<Dirent> = yield* Effect.tryPromise({
        try: () => fs.readdir(directory, { withFileTypes: true }),
        catch: (cause) => ({ _tag: "ReadDirectoryError" as const, cause })
      }).pipe(
        Effect.catch((error) => isMissingDirectory(error.cause) ? Effect.succeed([]) : Effect.die(error.cause))
      )
      entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      const files: Array<string> = []
      for (const entry of entries) {
        const child = relative.length === 0 ? entry.name : `${relative}/${entry.name}`
        if (entry.isDirectory()) {
          const childDirectory = path.join(directory, entry.name)
          if (childDirectory !== excluded) files.push(...yield* walk(childDirectory, child, excluded))
        } else if (entry.isFile()) {
          files.push(child)
        }
      }
      return files
    }
  )

export const inventorySourceFiles = Effect.fnUntraced(function*(
  root: string,
  packagePath: string,
  sourceDirectory: string,
  distributionDirectory: string
) {
  const packageRoot = path.join(root, packagePath)
  const sourceRoot = path.join(packageRoot, sourceDirectory)
  const distributionRoot = path.join(packageRoot, distributionDirectory)
  const sourceFiles = sourceRoot === distributionRoot ? [] : yield* walk(sourceRoot, "", distributionRoot)
  const projected = new Map<string, Array<string>>()
  const modules = new Map<string, Array<string>>()
  const directoryMains = new Map<string, string>()
  const packageTypes = new Map<string, "Module" | "CommonJS" | "Unspecified">()
  for (const file of sourceFiles) {
    const output = projectedFile(file)
    if (output === undefined) continue
    const distributionPath = posixJoin(distributionDirectory, output)
    const sourcePath = posixJoin(packagePath, sourceDirectory, file)
    const candidates = projected.get(distributionPath)
    if (candidates === undefined) projected.set(distributionPath, [sourcePath])
    else candidates.push(sourcePath)

    const extension = implementationExtension(file)
    if (extension !== undefined || !path.posix.basename(file).includes(".")) {
      const modulePath = extension === undefined ? file : file.slice(0, -extension.length)
      const moduleCandidates = modules.get(modulePath)
      if (moduleCandidates === undefined) modules.set(modulePath, [sourcePath])
      else moduleCandidates.push(sourcePath)
    }

    if (file.endsWith("package.json")) {
      const contents = yield* Effect.option(Effect.tryPromise({
        try: () => fs.readFile(path.join(sourceRoot, ...file.split("/")), "utf8"),
        catch: () => null
      }))
      if (Option.isSome(contents)) {
        const parsed = yield* Effect.option(Effect.try({
          try: () => JSON.parse(contents.value) as { readonly main?: unknown; readonly type?: unknown },
          catch: () => null
        }))
        if (Option.isSome(parsed)) {
          const directory = path.posix.dirname(distributionPath)
          if (typeof parsed.value.main === "string") directoryMains.set(directory, parsed.value.main)
          packageTypes.set(
            directory,
            parsed.value.type === "module" ? "Module" : parsed.value.type === "commonjs" ? "CommonJS" : "Unspecified"
          )
        }
      }
    }
  }
  projected.set("package.json", [posixJoin(packagePath, "package.json")])
  return {
    files: new Map(
      [...projected].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, sources]) => [
        file,
        { path: file, sources: sources.sort() }
      ])
    ),
    modules: new Map(
      [...modules].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([modulePath, sources]) => [
        modulePath,
        sources.sort()
      ])
    ),
    directoryMains,
    packageTypes
  }
})
