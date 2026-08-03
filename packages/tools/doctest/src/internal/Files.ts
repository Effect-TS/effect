import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import { hasMagic } from "glob"
import { parse } from "tsconfck"
import { DoctestError, fromUnknown } from "./DoctestError.ts"

const sourceExtensions = new Set([".cts", ".md", ".mts", ".ts", ".tsx"])
const toPosix = (path: string): string => path.replaceAll("\\", "/")

export const discover = Effect.fnUntraced(function*(
  patterns: ReadonlyArray<string>,
  configuredTsconfig: string | undefined
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const cwd = path.resolve()
  const canonical = (file: string): string => {
    const normalized = path.normalize(file)
    return path.sep === "\\" ? normalized.toLowerCase() : normalized
  }
  const resolvePattern = (pattern: string, directory: string): string => {
    const substituted = pattern.replaceAll("${configDir}", directory)
    return toPosix(path.isAbsolute(substituted) ? substituted : path.resolve(directory, substituted))
  }
  const recursiveDirectory = Effect.fnUntraced(function*(pattern: string) {
    const native = path.normalize(pattern)
    const exists = yield* fs.exists(native)
    if (
      !hasMagic(pattern) &&
      ((exists && (yield* fs.stat(native)).type === "Directory") || (!exists && path.extname(native) === ""))
    ) {
      return `${pattern.replace(/\/$/, "")}/**/*`
    }
    return pattern
  })
  const expand = Effect.fnUntraced(function*(patterns: ReadonlyArray<string>) {
    const literalFiles: Array<string> = []
    const globPatterns: Array<string> = []
    for (const pattern of patterns) {
      const file = path.resolve(cwd, pattern)
      const exists = yield* fs.exists(file)
      const directory = exists && (yield* fs.stat(file)).type === "Directory"
      if (exists && !directory) {
        literalFiles.push(file)
      } else {
        globPatterns.push(toPosix(directory ? path.join(pattern, "**/*") : pattern))
      }
    }
    const expanded = yield* Effect.forEach(
      globPatterns,
      (pattern) =>
        fs.glob(pattern, { root: cwd }).pipe(
          Effect.flatMap((files) =>
            Effect.filter(files, (file) =>
              fs.stat(path.resolve(cwd, file)).pipe(Effect.map((info) => info.type === "File")))
          )
        ),
      { concurrency: "unbounded" }
    )
    return [...new Set([...literalFiles, ...expanded.flat().map((file) => path.resolve(cwd, file))])]
  })
  const configuredFiles = Effect.fnUntraced(function*(tsconfig: string) {
    const parsed = yield* Effect.tryPromise({
      try: () => parse(tsconfig),
      catch: (cause) => fromUnknown(cause, `Could not parse TypeScript configuration '${tsconfig}'`)
    })
    const configurations = (parsed.extended ?? [parsed]) as ReadonlyArray<{
      readonly tsconfig: {
        readonly compilerOptions?: unknown
        readonly exclude?: unknown
        readonly files?: unknown
        readonly include?: unknown
      }
      readonly tsconfigFile: string
    }>
    const rootDirectory = path.dirname(parsed.tsconfigFile)
    const setting = (name: "exclude" | "files" | "include") => {
      const source = configurations.find(({ tsconfig }) => Object.hasOwn(tsconfig, name))
      const value = source?.tsconfig[name]
      return {
        directory: source === undefined ? rootDirectory : path.dirname(source.tsconfigFile),
        values: Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : undefined
      }
    }
    const compilerPath = (name: "declarationDir" | "outDir"): string | undefined => {
      const source = configurations.find(({ tsconfig }) =>
        typeof tsconfig.compilerOptions === "object" &&
        tsconfig.compilerOptions !== null &&
        Object.hasOwn(tsconfig.compilerOptions, name)
      )
      if (
        source === undefined || typeof source.tsconfig.compilerOptions !== "object" ||
        source.tsconfig.compilerOptions === null
      ) {
        return undefined
      }
      const value = (source.tsconfig.compilerOptions as Record<string, unknown>)[name]
      return typeof value === "string" ? resolvePattern(value, path.dirname(source.tsconfigFile)) : undefined
    }

    const configuredFiles = setting("files")
    const configuredInclude = setting("include")
    const configuredExclude = setting("exclude")
    const listed = (configuredFiles.values ?? []).map((file) => resolvePattern(file, configuredFiles.directory))
    const include = yield* Effect.forEach(
      configuredInclude.values ?? (configuredFiles.values === undefined ? ["**/*"] : []),
      (pattern) => recursiveDirectory(resolvePattern(pattern, configuredInclude.directory))
    )
    const defaultExclude = yield* Effect.forEach(
      ["node_modules", "bower_components", "jspm_packages"],
      (pattern) => recursiveDirectory(resolvePattern(pattern, rootDirectory))
    )
    const outputDirectories = yield* Effect.forEach(
      [compilerPath("outDir"), compilerPath("declarationDir")].filter((path): path is string => path !== undefined),
      recursiveDirectory
    )
    const exclude = configuredExclude.values === undefined
      ? [...defaultExclude, ...outputDirectories]
      : yield* Effect.forEach(
        configuredExclude.values,
        (pattern) => recursiveDirectory(resolvePattern(pattern, configuredExclude.directory))
      )
    const included = yield* Effect.forEach(
      include,
      (pattern) =>
        fs.glob(pattern, { exclude }).pipe(
          Effect.flatMap((files) =>
            Effect.filter(files, (file) => fs.stat(path.resolve(file)).pipe(Effect.map((info) => info.type === "File")))
          )
        ),
      { concurrency: "unbounded" }
    )
    return [...new Set([...listed, ...included.flat().map((file) => path.resolve(file))])]
  })

  if (configuredTsconfig === undefined && patterns.length === 0) {
    return yield* new DoctestError({ message: "Provide --tsconfig or at least one source file or glob pattern" })
  }

  const files = configuredTsconfig === undefined
    ? yield* expand(patterns)
    : yield* configuredFiles(configuredTsconfig)
  const selectedFiles = configuredTsconfig !== undefined && patterns.length > 0
    ? yield* expand(patterns)
    : undefined
  const selected = selectedFiles === undefined ? undefined : new Set(selectedFiles.map(canonical))
  const matched = files
    .filter((file) => selected === undefined || selected.has(canonical(file)))
    .filter((file) => sourceExtensions.has(path.extname(file)))
    .sort()
  if (matched.length === 0) {
    return yield* new DoctestError({ message: "No source files matched the provided patterns" })
  }
  return matched
})
