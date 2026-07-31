/**
 * @since 4.0.0
 */

import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Argument from "effect/unstable/cli/Argument"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { glob, hasMagic } from "glob"
import { existsSync, statSync } from "node:fs"
import { dirname, extname, isAbsolute, join, normalize, resolve } from "node:path"
import { parse } from "tsconfck"
import { Typechecker } from "./internal/Typechecker.ts"
import * as Source from "./Source.ts"

const files = Argument.string("files").pipe(
  Argument.withDescription("Optional source files or glob patterns used to filter the configured project"),
  Argument.variadic()
)

const tsconfig = Flag.file("tsconfig", { mustExist: true }).pipe(
  Flag.withDescription("TypeScript configuration to use for every documentation example"),
  Flag.optional
)

const diagnosticHeader = "Documentation example typecheck failed:\n\n"
const sourceExtensions = new Set([".cts", ".md", ".mts", ".ts", ".tsx"])
const toPosix = (path: string): string => path.replaceAll("\\", "/")
const canonical = (path: string): string => {
  const normalized = normalize(path)
  return process.platform === "win32" ? normalized.toLowerCase() : normalized
}

const resolvePattern = (pattern: string, directory: string): string => {
  const substituted = pattern.replaceAll("${configDir}", directory)
  return toPosix(isAbsolute(substituted) ? substituted : resolve(directory, substituted))
}

const recursiveDirectory = (pattern: string): string => {
  const native = normalize(pattern)
  if (
    !hasMagic(pattern) &&
    ((existsSync(native) && statSync(native).isDirectory()) || (!existsSync(native) && extname(native) === ""))
  ) {
    return `${pattern.replace(/\/$/, "")}/**/*`
  }
  return pattern
}

const expand = (patterns: ReadonlyArray<string>, cwd = process.cwd()): Promise<Array<string>> => {
  const literalFiles = patterns
    .map((pattern) => resolve(cwd, pattern))
    .filter((file) => existsSync(file) && !statSync(file).isDirectory())
  const globPatterns = patterns.filter((pattern) => {
    const file = resolve(cwd, pattern)
    return !existsSync(file) || statSync(file).isDirectory()
  }).map((pattern) => {
    const file = resolve(cwd, pattern)
    return toPosix(existsSync(file) && statSync(file).isDirectory() ? join(pattern, "**/*") : pattern)
  })
  const expanded = globPatterns.length === 0
    ? Promise.resolve([])
    : glob(globPatterns, {
      absolute: true,
      cwd,
      nodir: true,
      windowsPathsNoEscape: true,
      withFileTypes: false
    })
  return expanded.then((files) => [...new Set([...literalFiles, ...files])])
}

const configuredFiles = (tsconfig: string): Promise<Array<string>> =>
  parse(tsconfig).then((parsed) => {
    const configurations = (parsed.extended ?? [parsed]) as ReadonlyArray<{
      readonly tsconfig: {
        readonly compilerOptions?: unknown
        readonly exclude?: unknown
        readonly files?: unknown
        readonly include?: unknown
      }
      readonly tsconfigFile: string
    }>
    const rootDirectory = dirname(parsed.tsconfigFile)
    const setting = (name: "exclude" | "files" | "include") => {
      const source = configurations.find(({ tsconfig }) => Object.hasOwn(tsconfig, name))
      const value = source?.tsconfig[name]
      return {
        directory: source === undefined ? rootDirectory : dirname(source.tsconfigFile),
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
      return typeof value === "string" ? resolvePattern(value, dirname(source.tsconfigFile)) : undefined
    }

    const configuredFiles = setting("files")
    const configuredInclude = setting("include")
    const configuredExclude = setting("exclude")
    const listed = (configuredFiles.values ?? []).map((file) => resolvePattern(file, configuredFiles.directory))
    const include = (configuredInclude.values ?? (configuredFiles.values === undefined ? ["**/*"] : []))
      .map((pattern) => recursiveDirectory(resolvePattern(pattern, configuredInclude.directory)))
    const defaultExclude = ["node_modules", "bower_components", "jspm_packages"]
      .map((pattern) => recursiveDirectory(resolvePattern(pattern, rootDirectory)))
    const outputDirectories = [compilerPath("outDir"), compilerPath("declarationDir")]
      .filter((path): path is string => path !== undefined)
      .map(recursiveDirectory)
    const exclude = configuredExclude.values === undefined
      ? [...defaultExclude, ...outputDirectories]
      : configuredExclude.values.map((pattern) =>
        recursiveDirectory(resolvePattern(pattern, configuredExclude.directory))
      )

    return glob(include, {
      absolute: true,
      ignore: exclude,
      nodir: true,
      windowsPathsNoEscape: true,
      withFileTypes: false
    }).then((included) => [...new Set([...listed, ...included])])
  })

const run = Effect.fnUntraced(function*(patterns: ReadonlyArray<string>, configuredTsconfig: string | undefined) {
  if (configuredTsconfig === undefined && patterns.length === 0) {
    return yield* Effect.fail(new Error("Provide --tsconfig or at least one source file or glob pattern"))
  }

  const discovered = yield* Effect.tryPromise(() =>
    configuredTsconfig === undefined ? expand(patterns) : configuredFiles(configuredTsconfig)
  )
  const filtered = configuredTsconfig !== undefined && patterns.length > 0
    ? yield* Effect.tryPromise(() => expand(patterns)).pipe(
      Effect.map((files) => {
        const selected = new Set(files.map(canonical))
        return discovered.filter((file) => selected.has(canonical(file)))
      })
    )
    : discovered
  const matched = filtered.filter((file) => sourceExtensions.has(extname(file))).sort()
  if (matched.length === 0) {
    return yield* Effect.fail(new Error("No source files matched the provided patterns"))
  }

  const extracted = yield* Effect.tryPromise(() =>
    Promise.all(matched.map((file) => Source.extractFile(file).then((snippets) => ({ file, snippets }))))
  )
  const examples = extracted.filter(({ snippets }) => snippets.length > 0)

  const failures = yield* Effect.acquireUseRelease(
    Effect.sync(() => new Typechecker(configuredTsconfig)),
    (typechecker) =>
      Effect.promise(() => Promise.allSettled(examples.map(({ file, snippets }) => typechecker.check(file, snippets))))
        .pipe(Effect.map((results) =>
          results.flatMap((result) => {
            if (result.status !== "rejected") return []
            const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
            return [message.startsWith(diagnosticHeader) ? message.slice(diagnosticHeader.length) : message]
          })
        )),
    (typechecker) => Effect.promise(() => typechecker.close())
  )

  if (failures.length > 0) {
    return yield* Effect.fail(new Error(`${diagnosticHeader}${failures.join("\n\n")}`))
  }

  const count = examples.reduce((total, { snippets }) => total + snippets.length, 0)
  yield* Console.log(
    `Typechecked ${count} documentation snippet${count === 1 ? "" : "s"} in ${matched.length} file${
      matched.length === 1 ? "" : "s"
    }`
  )
})

/**
 * Command for typechecking marked documentation examples with the TypeScript native API.
 *
 * @category commands
 * @since 4.0.0
 */
export const cli = Command.make("doctest-typecheck", { files, tsconfig }).pipe(
  Command.withDescription("Typecheck marked TypeScript documentation examples without writing temporary files"),
  Command.withHandler(({ files, tsconfig }) =>
    run(files, Option.getOrUndefined(tsconfig)).pipe(
      Effect.mapError((cause) => new CliError.UserError({ cause }))
    )
  )
)
