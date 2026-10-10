/**
 * The `graphqlgen` command (EFF-1834 points 1 to 13).
 *
 * `graphqlgen [--config <path>] [--watch | --check]` loads `graphql.config.ts`
 * from the current directory, or the file `--config` names, generates every
 * `.graphql.ts` module in memory with {@link Generator.generate} and writes
 * the files whose bytes changed. Generated files whose `.graphql` source is
 * gone are deleted. Any error diagnostic means nothing is written.
 *
 * Exit codes: `0` on success, `1` when generation reports an error or
 * `--check` finds out-of-date files, `2` when the config can't be loaded.
 *
 * @since 4.0.0
 */
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import * as Config from "./Config.ts"
import * as Generator from "./Generator.ts"

/**
 * The config file could not be found, imported or decoded, or the generator
 * rejected it. Exits with code `2`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class ConfigLoadError extends Data.TaggedError("ConfigLoadError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 2
  override readonly [Runtime.errorReported] = false
}

/**
 * Generation reported at least one error diagnostic, or a file could not be
 * read or written. Exits with code `1`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class GenerateError extends Data.TaggedError("GenerateError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 1
  override readonly [Runtime.errorReported] = false
}

/**
 * `--check` found generated files that would be created, changed or deleted.
 * Exits with code `1`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class CheckError extends Data.TaggedError("CheckError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 1
  override readonly [Runtime.errorReported] = false
}

const config = Flag.String("config").pipe(
  Flag.withAlias("c"),
  Flag.withDescription("The config file to load (default: graphql.config.ts in the current directory)"),
  Flag.optional
)

const watch = Flag.Boolean("watch").pipe(
  Flag.withAlias("w"),
  Flag.withDescription("Regenerate whenever the schema, a document or the config changes"),
  Flag.withDefault(false)
)

const check = Flag.Boolean("check").pipe(
  Flag.withDescription("Write nothing; list the files that are out of date and exit 1 if there are any"),
  Flag.withDefault(false)
)

const root = Command.make("graphqlgen", { config, watch, check }).pipe(
  Command.withHandler(Effect.fnUntraced(function*(flags) {
    if (flags.watch && flags.check) {
      return yield* new CliError.UserError({ cause: "--watch and --check cannot be used together." })
    }
    if (flags.watch) {
      return yield* new CliError.UserError({ cause: "--watch is not supported yet." })
    }
    const path = yield* Path.Path
    const configPath = path.resolve(Option.getOrElse(flags.config, () => "graphql.config.ts"))
    const loaded = yield* loadConfig(configPath)
    const result = yield* generateFiles(loaded, path.dirname(configPath))
    const changes = yield* planChanges(result)
    yield* flags.check ? reportCheck(changes) : applyChanges(changes)
  }))
)

/**
 * Runs the `graphqlgen` command-line program.
 *
 * **Details**
 *
 * Diagnostics go to stderr as `file:line:col: error|warning: message` followed
 * by a code frame. Written, deleted and, with `--check`, out-of-date files are
 * listed on stdout. Failures carry their exit code through
 * `Runtime.errorExitCode`.
 *
 * @stability experimental
 * @category running
 * @since 4.0.0
 */
export const run: Effect.Effect<
  void,
  CliError.CliError | ConfigLoadError | GenerateError | CheckError,
  Command.Environment
> = Command.run(root, { version: "0.0.0" }).pipe(
  Effect.tapError((error) =>
    error._tag === "ConfigLoadError" || error._tag === "GenerateError" || error._tag === "CheckError"
      ? Console.error(error.message)
      : Effect.void
  )
)

// -----------------------------------------------------------------------------
// Config loading
// -----------------------------------------------------------------------------

const loadConfig = Effect.fnUntraced(function*(configPath: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const display = displayPath(path, configPath)
  const exists = yield* fs.exists(configPath).pipe(Effect.orElseSucceed(() => false))
  if (!exists) {
    return yield* new ConfigLoadError({ message: `error: config file not found: ${display}` })
  }
  const url = yield* path.toFileUrl(configPath).pipe(
    Effect.mapError((error) => new ConfigLoadError({ message: `error: ${display}: ${error.message}` }))
  )
  const module = yield* Effect.tryPromise({
    try: () => import(/* @vite-ignore */ url.href) as Promise<{ readonly default?: unknown }>,
    catch: (cause) => new ConfigLoadError({ message: importFailure(display, cause) })
  })
  if (module.default === undefined) {
    return yield* new ConfigLoadError({
      message:
        `error: ${display}: the config file has no default export. Export the config with \`export default defineConfig({ ... })\`.`
    })
  }
  return yield* Schema.decodeUnknownEffect(Config.Config)(module.default).pipe(
    Effect.mapError((error) =>
      new ConfigLoadError({
        message: `error: ${display}: the default export is not a valid config:\n${error.message}`
      })
    )
  )
})

/** Errors Node raises when it can't import a `.ts` file through type stripping. */
const typeStrippingCodes = new Set(["ERR_UNKNOWN_FILE_EXTENSION", "ERR_NO_TYPESCRIPT"])

/** Errors Node raises for TypeScript syntax that type stripping can't erase. */
const strippableSyntaxCodes = new Set([
  "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
  "ERR_INVALID_TYPESCRIPT_SYNTAX"
])

const importFailure = (display: string, cause: unknown): string => {
  const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined
  const detail = cause instanceof Error ? cause.message : String(cause)
  if (code !== undefined && typeStrippingCodes.has(code) && display.endsWith(".ts")) {
    return [
      `error: ${display}: this runtime cannot import a TypeScript config file (${code}).`,
      `graphqlgen loads the config with import(), which needs Node.js >= 22.18 (where type stripping is on by default), Bun or Deno.`,
      `Upgrade Node.js, or run graphqlgen with Bun or Deno.`,
      `  ${detail}`
    ].join("\n")
  }
  if (code === "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING") {
    return [
      `error: ${display}: Node.js does not strip types from files under node_modules (${code}).`,
      `Move the config out of node_modules, or run graphqlgen with Bun or Deno.`,
      `  ${detail}`
    ].join("\n")
  }
  if (code !== undefined && strippableSyntaxCodes.has(code)) {
    return [
      `error: ${display}: Node.js type stripping cannot load this config (${code}).`,
      `Type stripping only erases type annotations, so the config can't use enums, namespaces or parameter properties.`,
      `  ${detail}`
    ].join("\n")
  }
  return `error: ${display}: could not import the config: ${detail}`
}

// -----------------------------------------------------------------------------
// Generation
// -----------------------------------------------------------------------------

const generateFiles = Effect.fnUntraced(function*(config: Config.Config, cwd: string) {
  const path = yield* Path.Path
  const result = yield* Generator.generate(config, { cwd }).pipe(
    Effect.catchTags({
      ConfigError: (error) => Effect.fail(new ConfigLoadError({ message: `error: ${error.message}` })),
      PlatformError: (error) => Effect.fail(new GenerateError({ message: `error: ${error.message}` }))
    })
  )
  for (const diagnostic of result.diagnostics) {
    yield* Console.error(formatDiagnostic(path, cwd, diagnostic))
  }
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  if (errors > 0) {
    return yield* new GenerateError({
      message: `${errors} ${errors === 1 ? "error" : "errors"}; no files were written.`
    })
  }
  return result
})

const formatDiagnostic = (path: Path.Path, cwd: string, diagnostic: Generator.Diagnostic): string => {
  const location = [
    displayPath(path, path.resolve(cwd, diagnostic.path)),
    ...(diagnostic.line === undefined ? [] : [diagnostic.line]),
    ...(diagnostic.line === undefined || diagnostic.column === undefined ? [] : [diagnostic.column])
  ].join(":")
  const message = `${location}: ${diagnostic.severity}: ${diagnostic.message}`
  return diagnostic.codeFrame === undefined ? message : `${message}\n${diagnostic.codeFrame}`
}

/** A path relative to the current directory, with `/` separators. */
const displayPath = (path: Path.Path, absolute: string): string => {
  const relative = path.relative(path.resolve("."), absolute)
  return (relative === "" || path.isAbsolute(relative) ? absolute : relative).split(path.sep).join("/")
}

// -----------------------------------------------------------------------------
// Writing
// -----------------------------------------------------------------------------

interface Changes {
  readonly creates: ReadonlyArray<Generator.GeneratedFile>
  readonly updates: ReadonlyArray<Generator.GeneratedFile>
  readonly deletes: ReadonlyArray<string>
}

/** Compares the generated files with what is on disk; unchanged files are left out. */
const planChanges = Effect.fnUntraced(function*(result: Generator.GenerateResult) {
  const fs = yield* FileSystem.FileSystem
  const creates: Array<Generator.GeneratedFile> = []
  const updates: Array<Generator.GeneratedFile> = []
  for (const file of result.files) {
    if (!(yield* fs.exists(file.path))) {
      creates.push(file)
    } else if ((yield* fs.readFileString(file.path)) !== file.contents) {
      updates.push(file)
    }
  }
  const changes: Changes = { creates, updates, deletes: result.deletes }
  return changes
}, Effect.mapError((error) => new GenerateError({ message: `error: ${error.message}` })))

const applyChanges = Effect.fnUntraced(function*(changes: Changes) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  for (const file of [...changes.creates, ...changes.updates]) {
    yield* fs.makeDirectory(path.dirname(file.path), { recursive: true })
    yield* fs.writeFileString(file.path, file.contents)
  }
  for (const file of changes.deletes) {
    yield* fs.remove(file)
  }
  yield* listChanges(path, changes, { create: "created", update: "updated", delete: "deleted" })
}, Effect.mapError((error) => new GenerateError({ message: `error: ${error.message}` })))

const reportCheck = Effect.fnUntraced(function*(changes: Changes) {
  const path = yield* Path.Path
  const count = changes.creates.length + changes.updates.length + changes.deletes.length
  if (count === 0) return
  yield* listChanges(path, changes, { create: "would create", update: "would update", delete: "would delete" })
  return yield* new CheckError({
    message: `${count} generated ${count === 1 ? "file is" : "files are"} out of date. Run graphqlgen to update ${
      count === 1 ? "it" : "them"
    }.`
  })
})

const listChanges = (
  path: Path.Path,
  changes: Changes,
  verbs: { readonly create: string; readonly update: string; readonly delete: string }
) =>
  Effect.forEach([
    ...changes.creates.map((file) => `${verbs.create} ${displayPath(path, file.path)}`),
    ...changes.updates.map((file) => `${verbs.update} ${displayPath(path, file.path)}`),
    ...changes.deletes.map((file) => `${verbs.delete} ${displayPath(path, file)}`)
  ], (line) =>
    Console.log(line), { discard: true })
