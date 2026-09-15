/**
 * Builds self-installing modules from ahead-of-time compiled Schema decoders.
 *
 * @since 4.0.0
 */
import * as Data from "../../../Data.ts"
import * as Effect from "../../../Effect.ts"
import * as FileSystem from "../../../FileSystem.ts"
import * as Path from "../../../Path.ts"
import type * as PlatformError from "../../../PlatformError.ts"
import * as Schema from "../../../Schema.ts"
import * as SchemaAST from "../../../SchemaAST.ts"
import * as SchemaAOTCompiler from "../SchemaAOTCompiler.ts"

/**
 * An operation whose root AST should be prepared by {@link build}.
 *
 * @category models
 * @since 4.0.0
 */
export type Operation = "decode" | "encode" | "is" | "make"

/**
 * Loads the exports of a schema module during a build.
 *
 * @category models
 * @since 4.0.0
 */
export interface ModuleLoader {
  (): PromiseLike<unknown>
}

/**
 * Options for {@link build}.
 *
 * @category models
 * @since 4.0.0
 */
export interface BuildOptions {
  /**
   * Maps import specifiers relative to `baseUrl` to loaders for those same
   * modules. Only directly exported Schema values are compiled.
   */
  readonly modules: Readonly<Record<string, ModuleLoader>>
  /** The URL against which relative module specifiers are resolved. */
  readonly baseUrl: string | URL
  /** The file-system path of the generated module. */
  readonly outFile: string
  /** The parser operations to prepare. Defaults to decoding. */
  readonly operations?: ReadonlyArray<Operation> | undefined
}

/**
 * A summary of a completed {@link build}.
 *
 * @category models
 * @since 4.0.0
 */
export interface BuildResult {
  /** The absolute path written by the build. */
  readonly outFile: string
  /** The number of loaded modules containing at least one Schema export. */
  readonly modules: number
  /** The number of directly exported Schema values found in those modules. */
  readonly schemas: number
}

/**
 * An error raised while loading modules or generating an AOT module.
 *
 * @category errors
 * @since 4.0.0
 */
export class BuildError extends Data.TaggedError("BuildError")<{
  readonly _tag: "BuildError"
  readonly cause: unknown
  readonly kind: "Generate" | "InvalidModule" | "LoadModule" | "ResolveModule"
  readonly message: string
  readonly module?: string | undefined
}> {}

interface ExportedSchema {
  readonly alias: string
  readonly exportName: string
  readonly schema: Schema.Top
}

const operationOrder: ReadonlyArray<Operation> = ["decode", "encode", "is", "make"]

const importPath = (
  path: Path.Path,
  outFile: string,
  baseUrl: string | URL,
  specifier: string
): Effect.Effect<string, BuildError> =>
  Effect.gen(function*() {
    const url = yield* Effect.try({
      try: () => new URL(specifier, baseUrl),
      catch: (cause) =>
        new BuildError({
          cause,
          kind: "ResolveModule",
          message: `Could not resolve schema module ${JSON.stringify(specifier)}`,
          module: specifier
        })
    })
    const sourcePath = yield* path.fromFileUrl(url).pipe(
      Effect.mapError((cause) =>
        new BuildError({
          cause,
          kind: "ResolveModule",
          message: `Schema module ${JSON.stringify(specifier)} does not resolve to a file`,
          module: specifier
        })
      )
    )
    const relative = path.relative(path.dirname(outFile), sourcePath)
    if (path.isAbsolute(relative)) {
      return yield* new BuildError({
        cause: undefined,
        kind: "ResolveModule",
        message: `Schema module ${JSON.stringify(specifier)} cannot be imported relative to the output file`,
        module: specifier
      })
    }
    const normalized = path.sep === "/" ? relative : relative.split(path.sep).join("/")
    return normalized.startsWith(".") ? normalized : `./${normalized}`
  })

const root = (
  exported: ExportedSchema,
  operation: Operation
): readonly [ast: SchemaAST.AST, expression: string, derived: boolean] => {
  const expression = `${exported.alias}[${JSON.stringify(exported.exportName)}].ast`
  switch (operation) {
    case "decode":
      return [exported.schema.ast, expression, false]
    case "encode": {
      const ast = SchemaAST.flip(exported.schema.ast)
      return ast === exported.schema.ast ? [ast, expression, false] : [ast, `A.flip(${expression})`, true]
    }
    case "is":
    case "make": {
      const ast = SchemaAST.toType(exported.schema.ast)
      return ast === exported.schema.ast ? [ast, expression, false] : [ast, `A.toType(${expression})`, true]
    }
  }
}

/**
 * Writes a self-installing AOT module for Schema values exported by a set of
 * modules.
 *
 * **When to use**
 *
 * Use when a build script should let an application install generated decoders
 * by importing one generated module at startup.
 *
 * **Details**
 *
 * Module keys are import specifiers relative to `baseUrl`. Their loaders run
 * sequentially during the build. The builder sorts module specifiers and export
 * names, compiles direct Schema exports, and writes deterministic source using
 * `FileSystem`. The generated module imports those exports and installs their
 * decoders in the shared Schema parser registry as a module side effect. A lazy
 * record returned by `import.meta.glob` can be passed as `modules` directly.
 *
 * Decoding is prepared by default. `is` and `make` prepare the type-side AST;
 * `encode` prepares the flipped AST. Nested dependencies are discovered by the
 * AOT compiler and do not need separate exports.
 *
 * **Gotchas**
 *
 * Loaders execute application modules during the build. Each loader must return
 * the same module named by its key. The generated file must be rebuilt after a
 * schema definition or Effect version changes. Unsupported operations retain
 * the interpreter fallback. Build configurations that mark modules as
 * side-effect free must retain the generated import.
 *
 * @category compilation
 * @since 4.0.0
 */
export const build: (
  options: BuildOptions
) => Effect.Effect<
  BuildResult,
  BuildError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> = Effect.fnUntraced(function*(options) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const outFile = path.resolve(options.outFile)
  const requested = new Set(options.operations ?? ["decode"])
  const operations = operationOrder.filter((operation) => requested.has(operation))
  const imports: Array<string> = []
  const exportedSchemas: Array<ExportedSchema> = []

  for (const specifier of Object.keys(options.modules).sort()) {
    const loader = options.modules[specifier]!
    const loaded = yield* Effect.tryPromise({
      try: () => loader(),
      catch: (cause) =>
        new BuildError({
          cause,
          kind: "LoadModule",
          message: `Could not load schema module ${JSON.stringify(specifier)}`,
          module: specifier
        })
    })
    if (typeof loaded !== "object" || loaded === null) {
      return yield* new BuildError({
        cause: loaded,
        kind: "InvalidModule",
        message: `Schema module ${JSON.stringify(specifier)} did not load a module namespace`,
        module: specifier
      })
    }
    const namespace = loaded as Readonly<Record<string, unknown>>
    const exports = Object.keys(namespace).filter((name) => Schema.isSchema(namespace[name])).sort()
    if (exports.length === 0) continue
    const alias = `m${imports.length}`
    const specifierFromOutput = yield* importPath(path, outFile, options.baseUrl, specifier)
    imports.push(`import * as ${alias} from ${JSON.stringify(specifierFromOutput)};`)
    for (const exportName of exports) {
      exportedSchemas.push({
        alias,
        exportName,
        schema: namespace[exportName] as Schema.Top
      })
    }
  }

  const source = yield* Effect.try({
    try: () => {
      const asts: Array<SchemaAST.AST> = []
      const expressions: Array<string> = []
      const seen = new Set<SchemaAST.AST>()
      let needsSchemaASTImport = false
      for (const exported of exportedSchemas) {
        for (const operation of operations) {
          const [ast, expression, isDerived] = root(exported, operation)
          if (seen.has(ast)) continue
          seen.add(ast)
          asts.push(ast)
          expressions.push(expression)
          needsSchemaASTImport ||= isDerived
        }
      }
      return [
        ...imports,
        ...(needsSchemaASTImport ? ["import * as A from \"effect/SchemaAST\";"] : []),
        SchemaAOTCompiler.compile(asts),
        `install([${expressions.join(",")}]);`,
        ""
      ].join("\n")
    },
    catch: (cause) =>
      new BuildError({
        cause,
        kind: "Generate",
        message: "Could not generate the Schema AOT module"
      })
  })

  yield* fs.makeDirectory(path.dirname(outFile), { recursive: true })
  yield* fs.writeFileString(outFile, source)
  return {
    outFile,
    modules: imports.length,
    schemas: exportedSchemas.length
  }
})
