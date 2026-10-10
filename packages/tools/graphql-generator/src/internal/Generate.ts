/**
 * The body of `Generator.generate`, plus the parsed-input cache watch mode
 * passes to it.
 *
 * @internal
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type { PlatformError } from "effect/PlatformError"
import * as Result from "effect/Result"
import type { Config } from "../Config.ts"
import type { Diagnostic, GenerateResult } from "../Generator.ts"
import type * as Ast from "./Ast.ts"
import { type Diagnostic as InternalDiagnostic, make, type Source } from "./Diagnostic.ts"
import * as Emitter from "./Emitter.ts"
import * as Glob from "./Glob.ts"
import * as IntrospectionReader from "./IntrospectionReader.ts"
import { parse } from "./Parser.ts"
import type * as SchemaModel from "./SchemaModel.ts"
import * as SdlReader from "./SdlReader.ts"
import * as Validate from "./Validate.ts"

/**
 * Parsed inputs that {@link generate} reuses across calls in watch mode. The
 * schema and each document are parsed again only when their path or contents
 * change; files are still read on every call.
 */
export interface Cache {
  schema: {
    readonly path: string
    readonly source: Source
    readonly result: Result.Result<SchemaModel.Schema, InternalDiagnostic>
  } | undefined
  documents: Map<string, ParsedDocument>
}

interface ParsedDocument {
  readonly display: string
  readonly body: string
  readonly file: Emitter.DocumentFile | undefined
  readonly diagnostics: ReadonlyArray<InternalDiagnostic>
}

export const makeCache = (): Cache => ({ schema: undefined, documents: new Map() })

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string
}> {}

export const generate: (
  config: Config,
  options: { readonly cwd: string; readonly cache?: Cache | undefined }
) => Effect.Effect<GenerateResult, ConfigError | PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fnUntraced(
  function*(config: Config, options: { readonly cwd: string; readonly cache?: Cache | undefined }) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const cwd = path.resolve(options.cwd)
    const display = (absolute: string): string => path.relative(cwd, absolute).split(path.sep).join("/")
    const importExtension = config.importExtension ?? ".ts"
    const failed = (diagnostics: ReadonlyArray<Diagnostic>): GenerateResult => ({ files: [], deletes: [], diagnostics })
    const cache = options.cache ?? makeCache()

    // Schema
    const schemaPath = path.resolve(cwd, config.schema)
    const schemaSource: Source = { path: display(schemaPath), body: yield* fs.readFileString(schemaPath) }
    if (
      cache.schema === undefined || cache.schema.path !== schemaPath ||
      cache.schema.source.path !== schemaSource.path || cache.schema.source.body !== schemaSource.body
    ) {
      cache.schema = {
        path: schemaPath,
        source: schemaSource,
        result: readSchema(schemaSource, schemaPath.endsWith(".json"))
      }
    }
    const schemaResult = cache.schema.result
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
    const documents = new Map<string, ParsedDocument>()
    for (const documentPath of documentPaths) {
      const source: Source = { path: display(documentPath), body: yield* fs.readFileString(documentPath) }
      const cached = cache.documents.get(documentPath)
      const parsed = cached !== undefined && cached.display === source.path && cached.body === source.body
        ? cached
        : parseDocument(path, documentPath, source)
      documents.set(documentPath, parsed)
      diagnostics.push(...parsed.diagnostics)
      if (parsed.file !== undefined) files.push(parsed.file)
    }
    cache.documents = documents
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

/** Parses one document and keeps only its executable definitions. */
const parseDocument = (path: Path.Path, documentPath: string, source: Source): ParsedDocument => {
  const parsed = parse(source)
  if (Result.isFailure(parsed)) {
    return { display: source.path, body: source.body, file: undefined, diagnostics: [parsed.failure] }
  }
  const executable: Array<Ast.Definition> = []
  const diagnostics: Array<InternalDiagnostic> = []
  for (const definition of parsed.success.definitions) {
    if (definition._tag === "OperationDefinition" || definition._tag === "FragmentDefinition") {
      executable.push(definition)
    } else {
      const name = "name" in definition ? `"${definition.name.value}"` : "schema"
      diagnostics.push(make(source, definition.loc.start, `The ${name} definition is not executable.`))
    }
  }
  return {
    display: source.path,
    body: source.body,
    file: {
      source,
      document: { ...parsed.success, definitions: executable },
      outputPath: `${documentPath}.ts`,
      sourceName: path.basename(documentPath)
    },
    diagnostics
  }
}

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
