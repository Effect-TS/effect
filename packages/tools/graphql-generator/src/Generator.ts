/**
 * The programmatic core of `@effect/graphql-generator` (EFF-1834 point 9).
 *
 * {@link generate} reads the schema and the document files a {@link Config}
 * names and returns every generated file with its contents, plus located
 * diagnostics. It never writes to disk or stdout; the CLI, and later other
 * integrations, decide what to do with the result.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type { PlatformError } from "effect/PlatformError"
import * as Result from "effect/Result"
import type { Config } from "./Config.ts"
import type * as Ast from "./internal/Ast.ts"
import { type Diagnostic as InternalDiagnostic, make, type Source } from "./internal/Diagnostic.ts"
import * as Emitter from "./internal/Emitter.ts"
import * as Glob from "./internal/Glob.ts"
import * as IntrospectionReader from "./internal/IntrospectionReader.ts"
import { parse } from "./internal/Parser.ts"
import type * as SchemaModel from "./internal/SchemaModel.ts"
import * as SdlReader from "./internal/SdlReader.ts"
import * as Validate from "./internal/Validate.ts"

/**
 * A generated file: an absolute path and the full contents to write there.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface GeneratedFile {
  readonly path: string
  readonly contents: string
}

/**
 * A problem found while generating.
 *
 * - `path` is relative to the `cwd` passed to {@link generate}, with `/`
 *   separators.
 * - `line` and `column` are 1-based. They, and `codeFrame`, are `undefined`
 *   for diagnostics about the run as a whole, such as the unmapped-scalars
 *   warning, which is reported against the schema file.
 * - Any `"error"` means the output must not be written. Warnings don't stop
 *   generation.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Diagnostic {
  readonly severity: "error" | "warning"
  readonly path: string
  readonly line: number | undefined
  readonly column: number | undefined
  readonly message: string
  readonly codeFrame: string | undefined
}

/**
 * The result of {@link generate}. `files` and `deletes` are empty when
 * `diagnostics` holds an error.
 *
 * `deletes` lists the absolute paths of stale generated files: every
 * `*.graphql.ts` under a `documents` glob root that starts with the generator's
 * header, has no `.graphql` source next to it and isn't among `files`. Files
 * without the header are never listed.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface GenerateResult {
  readonly files: ReadonlyArray<GeneratedFile>
  readonly deletes: ReadonlyArray<string>
  readonly diagnostics: ReadonlyArray<Diagnostic>
}

/**
 * Options for {@link generate}. Relative paths in the config, and the
 * `documents` globs, resolve against `cwd`, which is normally the config
 * file's directory.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface GenerateOptions {
  readonly cwd: string
}

/**
 * The config cannot be used with this schema, e.g. a `scalars` key that
 * isn't a custom scalar or a built-in `Int`, `Float` or `ID`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string
}> {}

/**
 * Generates the `.graphql.ts` module for every document file and the shared
 * module, in memory.
 *
 * **Details**
 *
 * - `foo.graphql` generates `foo.graphql.ts` next to it.
 * - The shared module goes to `config.shared`, or next to the schema as
 *   `<schema name>.graphql.ts`, and holds only the scalars, enums, input
 *   objects and possible `__typename` unions the operations reach.
 * - Unmapped custom scalars decode as `Schema.Json`, and one warning lists
 *   every one the operations reach.
 * - A selection on an interface or union decodes as a `Schema.Union`
 *   discriminated by `__typename`, which is added to the document. Types the
 *   selection doesn't name, including ones the server adds later, fall into
 *   a last member built with `GraphQL.otherTypename`.
 * - `@skip` / `@include` with a variable condition make the fields they cover
 *   optional keys; literal conditions are folded.
 * - Recursive input objects are not supported yet and are reported as
 *   errors.
 *
 * @stability experimental
 * @category generation
 * @since 4.0.0
 */
export const generate: (
  config: Config,
  options: GenerateOptions
) => Effect.Effect<GenerateResult, ConfigError | PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fnUntraced(
  function*(config: Config, options: GenerateOptions) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const cwd = path.resolve(options.cwd)
    const display = (absolute: string): string => path.relative(cwd, absolute).split(path.sep).join("/")
    const importExtension = config.importExtension ?? ".ts"
    const failed = (diagnostics: ReadonlyArray<Diagnostic>): GenerateResult => ({ files: [], deletes: [], diagnostics })

    // Schema
    const schemaPath = path.resolve(cwd, config.schema)
    const schemaSource: Source = { path: display(schemaPath), body: yield* fs.readFileString(schemaPath) }
    const schemaResult = readSchema(schemaSource, schemaPath.endsWith(".json"))
    if (Result.isFailure(schemaResult)) return failed([toPublic(schemaResult.failure)])
    const schema = schemaResult.success

    // Output locations and scalar mappings
    const sharedPath = config.shared === undefined
      ? schemaPath.replace(/\.(?:graphql|gql|json)$/, "") + ".graphql.ts"
      : path.resolve(cwd, config.shared)
    const withExtension = (specifier: string): string => specifier.replace(/\.[jt]s$/, "") + importExtension
    const relativeSpecifier = (from: string, to: string): string => {
      const relative = path.relative(path.dirname(from), to).split(path.sep).join("/")
      return relative.startsWith(".") ? relative : `./${relative}`
    }
    const scalars = yield* resolveScalars(
      config,
      schema,
      (module) =>
        module.startsWith("./") || module.startsWith("../") || path.isAbsolute(module)
          ? withExtension(relativeSpecifier(sharedPath, path.resolve(cwd, module)))
          : module
    )

    // Documents
    const documentPaths = yield* findDocuments(fs, path, cwd, config.documents, schemaPath)
    const files: Array<Emitter.DocumentFile> = []
    const diagnostics: Array<InternalDiagnostic> = []
    for (const documentPath of documentPaths) {
      const source: Source = { path: display(documentPath), body: yield* fs.readFileString(documentPath) }
      const parsed = parse(source)
      if (Result.isFailure(parsed)) {
        diagnostics.push(parsed.failure)
        continue
      }
      const executable: Array<Ast.Definition> = []
      for (const definition of parsed.success.definitions) {
        if (definition._tag === "OperationDefinition" || definition._tag === "FragmentDefinition") {
          executable.push(definition)
        } else {
          const name = "name" in definition ? `"${definition.name.value}"` : "schema"
          diagnostics.push(make(source, definition.loc.start, `The ${name} definition is not executable.`))
        }
      }
      files.push({
        source,
        document: { ...parsed.success, definitions: executable },
        outputPath: `${documentPath}.ts`,
        sourceName: path.basename(documentPath)
      })
    }
    if (diagnostics.length > 0) return failed(diagnostics.map(toPublic))
    const validation = Validate.validate(schema, files)
    if (validation.length > 0) return failed(validation.map(toPublic))

    // Emit
    const output = Emitter.emit({
      schema,
      files,
      sharedPath,
      scalars,
      importSpecifier: (from, to) => withExtension(relativeSpecifier(from, to))
    })
    if (output.errors.length > 0) return failed(output.errors.map(toPublic))
    const deletes = yield* findStale(fs, path, cwd, config.documents, new Set(output.files.map((file) => file.path)))
    return {
      files: output.files,
      deletes,
      diagnostics: output.unmappedScalars.length === 0 ? [] : [{
        severity: "warning",
        path: schemaSource.path,
        line: undefined,
        column: undefined,
        message: `Custom scalars without a mapping decode as Schema.Json: ${
          output.unmappedScalars.join(", ")
        }. Map each one to a codec with \`scalars\` in the config.`,
        codeFrame: undefined
      }]
    }
  }
)

const toPublic = (diagnostic: InternalDiagnostic): Diagnostic => ({
  severity: "error",
  path: diagnostic.path,
  line: diagnostic.line,
  column: diagnostic.column,
  message: diagnostic.message,
  codeFrame: diagnostic.codeFrame
})

const readSchema = (source: Source, json: boolean): Result.Result<SchemaModel.Schema, InternalDiagnostic> => {
  if (json) return IntrospectionReader.read(source)
  const document = parse(source)
  return Result.isFailure(document) ? Result.fail(document.failure) : SdlReader.read(source, document.success)
}

const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** Checks each `scalars` entry against the schema and works out the shared module's import specifier. */
const resolveScalars = (
  config: Config,
  schema: SchemaModel.Schema,
  specifierFor: (module: string) => string
): Effect.Effect<ReadonlyMap<string, Emitter.ScalarMapping>, ConfigError> => {
  const scalars = new Map<string, Emitter.ScalarMapping>()
  for (const [name, specifier] of Object.entries(config.scalars ?? {})) {
    const type = schema.types.get(name)
    if (type === undefined) {
      return Effect.fail(new ConfigError({ message: `scalars.${name}: the schema has no type named "${name}".` }))
    }
    if (type._tag !== "ScalarType") {
      return Effect.fail(
        new ConfigError({ message: `scalars.${name}: "${name}" is not a scalar, so it can't be mapped to a codec.` })
      )
    }
    if (name === "String" || name === "Boolean") {
      return Effect.fail(
        new ConfigError({ message: `scalars.${name}: the built-in ${name} can't be overridden.` })
      )
    }
    const hash = specifier.lastIndexOf("#")
    const module = specifier.slice(0, hash)
    const exportName = specifier.slice(hash + 1)
    if (module === "" || !identifier.test(exportName)) {
      return Effect.fail(
        new ConfigError({
          message: `scalars.${name}: expected "<module>#<export>" with an identifier after the #, got "${specifier}".`
        })
      )
    }
    scalars.set(name, { specifier: specifierFor(module), exportName })
  }
  return Effect.succeed(scalars)
}

/**
 * Visits every file under `directory`, skipping `node_modules` and
 * dot-directories. `relative` is the directory's `/`-separated path from the
 * config file.
 */
const walkFiles = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  directory: string,
  relative: string,
  visit: (absolute: string, relative: string) => Effect.Effect<void, PlatformError>
): Effect.Effect<void, PlatformError> =>
  Effect.gen(function*() {
    const entries = yield* fs.readDirectory(directory)
    for (const entry of entries.sort()) {
      if (entry.startsWith(".") || entry === "node_modules") continue
      const absolute = path.join(directory, entry)
      const entryRelative = relative === "" ? entry : `${relative}/${entry}`
      const info = yield* fs.stat(absolute)
      if (info.type === "Directory") {
        yield* walkFiles(fs, path, absolute, entryRelative, visit)
      } else if (info.type === "File") {
        yield* visit(absolute, entryRelative)
      }
    }
  })

/** Each `documents` glob with the absolute directory to walk, when it exists. */
const globRoots = Effect.fnUntraced(function*(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  cwd: string,
  patterns: ReadonlyArray<string>
) {
  const roots: Array<{ readonly glob: Glob.Glob; readonly directory: string }> = []
  for (const pattern of patterns) {
    const glob = Glob.make(pattern)
    // Check before path.join normalizes away segments. Both walks must skip
    // protected roots, but navigation through `.` and `..` remains valid.
    if (
      glob.root.split("/").some((segment) =>
        segment === "node_modules" || (segment.startsWith(".") && segment !== "." && segment !== "..")
      )
    ) continue
    const directory = path.join(cwd, glob.root)
    if (yield* fs.exists(directory)) roots.push({ glob, directory })
  }
  return roots
})

/**
 * The absolute paths of every file matching a `documents` glob, sorted.
 * `node_modules`, dot-directories and the schema file are skipped.
 */
const findDocuments = Effect.fnUntraced(function*(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  cwd: string,
  patterns: ReadonlyArray<string>,
  schemaPath: string
) {
  const found = new Set<string>()
  for (const { directory, glob } of yield* globRoots(fs, path, cwd, patterns)) {
    yield* walkFiles(fs, path, directory, glob.root, (absolute, relative) =>
      Effect.sync(() => {
        if (glob.matches(relative) && absolute !== schemaPath) found.add(absolute)
      }))
  }
  return Array.from(found).sort()
})

/**
 * The absolute paths of generated files under the `documents` glob roots that
 * no longer have a source, sorted. Only files starting with the generator's
 * header count, and files about to be written never do.
 */
const findStale = Effect.fnUntraced(function*(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  cwd: string,
  patterns: ReadonlyArray<string>,
  outputs: ReadonlySet<string>
) {
  const found = new Set<string>()
  for (const { directory, glob } of yield* globRoots(fs, path, cwd, patterns)) {
    yield* walkFiles(fs, path, directory, glob.root, (absolute) =>
      Effect.gen(function*() {
        if (!absolute.endsWith(".graphql.ts") || outputs.has(absolute) || found.has(absolute)) return
        if (yield* fs.exists(absolute.slice(0, -".ts".length))) return
        const contents = yield* fs.readFileString(absolute)
        if (contents.startsWith(Emitter.headerPrefix)) found.add(absolute)
      }))
  }
  return Array.from(found).sort()
})
