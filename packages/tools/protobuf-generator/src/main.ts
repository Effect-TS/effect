/**
 * The `protoc-gen-effect` command.
 *
 * Without arguments it is a plugin for protoc and buf: it reads a
 * `CodeGeneratorRequest` from standard input and writes the
 * `CodeGeneratorResponse` of {@link Generator.generate} to standard output.
 *
 * `protoc-gen-effect generate <descriptor-set> --out <dir>` generates the
 * modules of every file in a `FileDescriptorSet`, as written by
 * `buf build -o set.binpb` or
 * `protoc --include_imports --descriptor_set_out=set.binpb`, except the files
 * whose types come from `effect`, and writes those whose bytes changed. With
 * `--check` it writes nothing and lists the files that are out of date.
 * `--file` selects files and names their modules, `--jsdoc` and `--header`
 * add text to the JSDoc of every export and to the top of every module, and
 * `--import-map` replaces import specifiers.
 *
 * Exit codes: `0` on success, `1` when generation fails or `--check` finds
 * out-of-date files, `2` for invalid CLI usage or a descriptor set that can't
 * be read.
 *
 * @since 4.0.7
 */
import * as Bytes from "effect/Bytes"
import * as Argument from "effect/cli/Argument"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import type { PlatformError } from "effect/PlatformError"
import * as Protobuf from "effect/protobuf/Protobuf"
import { FileDescriptorSet } from "effect/protobuf/ProtobufDescriptor"
import { CodeGeneratorRequest, CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as Generator from "./Generator.ts"
import { SUPPORTED } from "./internal/features.ts"
import { type GeneratedFile, generateFiles, GeneratorError, isProvided } from "./internal/generate.ts"

/**
 * The descriptor set could not be read or decoded. Exits with code `2`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.7
 */
export class DescriptorSetError extends Data.TaggedError("DescriptorSetError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 2
  override readonly [Runtime.errorReported] = false
}

/**
 * The generator rejected the descriptor set, or a file could not be written.
 * Exits with code `1`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.7
 */
export class GenerateError extends Data.TaggedError("GenerateError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 1
  override readonly [Runtime.errorReported] = false
}

/**
 * `--check` found generated files that would be created or changed. Exits with
 * code `1`.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.7
 */
export class CheckError extends Data.TaggedError("CheckError")<{
  readonly message: string
}> {
  override readonly [Runtime.errorExitCode] = 1
  override readonly [Runtime.errorReported] = false
}

// -----------------------------------------------------------------------------
// plugin
// -----------------------------------------------------------------------------

const decodeRequest = Schema.decodeUnknownEffect(Protobuf.toCodec(CodeGeneratorRequest))
const encodeResponse = Schema.encodeSync(Protobuf.toCodec(CodeGeneratorResponse))

const plugin = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const input = Bytes.concat(yield* Stream.runCollect(stdio.stdin))
  // A request that cannot be decoded is answered with an error as well.
  const response = yield* decodeRequest(input).pipe(
    Effect.map(Generator.generate),
    Effect.catchTag("SchemaError", (error) =>
      Effect.succeed<CodeGeneratorResponse>({
        ...SUPPORTED,
        error: `invalid CodeGeneratorRequest: ${error.message}`,
        file: []
      }))
  )
  yield* Stream.run(Stream.succeed(encodeResponse(response)), stdio.stdout())
})

// -----------------------------------------------------------------------------
// generate
// -----------------------------------------------------------------------------

const decodeSet = Schema.decodeUnknownEffect(Protobuf.toCodec(FileDescriptorSet))

const readSet = Effect.fnUntraced(function*(file: string) {
  const fs = yield* FileSystem.FileSystem
  const bytes = yield* fs.readFile(file).pipe(
    Effect.mapError((error) => new DescriptorSetError({ message: `${file}: ${error.message}` }))
  )
  return yield* decodeSet(bytes).pipe(
    Effect.mapError((error) =>
      new DescriptorSetError({ message: `${file}: not a FileDescriptorSet: ${error.message}` })
    )
  )
})

interface Change {
  readonly path: string
  readonly content: string
  readonly kind: "create" | "update"
}

/** The generated files that differ from what is on disk. */
const plan = Effect.fnUntraced(function*(out: string, files: ReadonlyArray<GeneratedFile>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const changes: Array<Change> = []
  for (const file of files) {
    const target = path.join(out, file.name)
    if (!(yield* fs.exists(target))) {
      changes.push({ path: target, content: file.content, kind: "create" })
    } else if ((yield* fs.readFileString(target)) !== file.content) {
      changes.push({ path: target, content: file.content, kind: "update" })
    }
  }
  return changes
}, Effect.mapError((error) => new GenerateError({ message: error.message })))

const write = Effect.fnUntraced(function*(changes: ReadonlyArray<Change>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  for (const change of changes) {
    yield* fs.makeDirectory(path.dirname(change.path), { recursive: true })
    yield* fs.writeFileString(change.path, change.content)
  }
}, Effect.mapError((error) => new GenerateError({ message: error.message })))

/** Lists changes with their paths relative to the current directory. */
const list = Effect.fnUntraced(function*(changes: ReadonlyArray<Change>, verbs: Record<Change["kind"], string>) {
  const path = yield* Path.Path
  for (const change of changes) {
    yield* Console.log(`${verbs[change.kind]} ${path.relative(path.resolve("."), change.path)}`)
  }
})

const generate = Command.make("generate", {
  descriptorSet: Argument.File("descriptor-set", { mustExist: true }).pipe(
    Argument.withDescription("A FileDescriptorSet, from `buf build -o` or `protoc --descriptor_set_out`")
  ),
  out: Flag.Directory("out").pipe(
    Flag.withAlias("o"),
    Flag.withDescription("The directory to write the modules to")
  ),
  importExtension: Flag.Literals("import-extension", ["js", "ts", "none"]).pipe(
    Flag.withDescription("The extension of imports between generated modules"),
    Flag.withDefault("js")
  ),
  timestamp: Flag.Literals("timestamp", ["datetime", "parts"]).pipe(
    Flag.withDescription("Decode google.protobuf.Timestamp as a DateTime.Utc, or as its seconds and nanos"),
    Flag.withDefault("datetime")
  ),
  duration: Flag.Literals("duration", ["duration", "parts"]).pipe(
    Flag.withDescription("Decode google.protobuf.Duration as a Duration, or as its seconds and nanos"),
    Flag.withDefault("duration")
  ),
  files: Flag.String("file").pipe(
    Flag.withMetavar("proto[=output]"),
    Flag.withDescription(
      "Generate only this file of the set, optionally under another name; the files whose types come from effect too"
    ),
    Flag.atLeast(0)
  ),
  jsdoc: Flag.String("jsdoc").pipe(
    Flag.withDescription("Text to append to the JSDoc of every export, such as tags"),
    Flag.optional
  ),
  header: Flag.String("header").pipe(
    Flag.withDescription("Text to write at the top of every module, such as a module JSDoc"),
    Flag.optional
  ),
  protoMap: Flag.KeyValuePair("proto-map").pipe(
    Flag.withDescription(
      "Import a .proto file, or a directory ending in /, from a module instead of generating it, such as acme/common/=@acme/common-proto/"
    ),
    Flag.withDefault({})
  ),
  importMap: Flag.KeyValuePair("import-map").pipe(
    Flag.withDescription("Replace an import specifier, such as effect/Schema=../Schema.ts"),
    Flag.withDefault({})
  ),
  check: Flag.Boolean("check").pipe(
    Flag.withDescription("Write nothing; list the files that are out of date and exit 1 if there are any"),
    Flag.withDefault(false)
  )
}).pipe(
  Command.withDescription("Generates the modules of a descriptor set"),
  Command.withHandler(Effect.fnUntraced(function*(input) {
    const set = yield* readSet(input.descriptorSet)
    // `--file proto=output` selects a file and names its module.
    const selected = new Map(input.files.map((file) => {
      const eq = file.indexOf("=")
      return eq === -1 ? [file, undefined] : [file.slice(0, eq), file.slice(eq + 1)]
    }))
    const options = {
      importExtension: input.importExtension,
      timestamp: input.timestamp,
      duration: input.duration,
      jsdoc: Option.getOrUndefined(input.jsdoc),
      header: Option.getOrUndefined(input.header),
      importMap: input.importMap,
      protoMap: input.protoMap
    }
    const files = yield* Effect.suspend(() => {
      try {
        const names = selected.size > 0
          ? [...selected.keys()]
          : set.file.map((file) => file.name ?? "").filter((name) => !isProvided(name, options))
        return Effect.succeed(
          generateFiles(set.file, names, options).map((file, i) => ({
            name: selected.get(names[i]) ?? file.name,
            content: file.content
          }))
        )
      } catch (e) {
        if (e instanceof GeneratorError) return Effect.fail(new GenerateError({ message: e.message }))
        throw e
      }
    })
    const changes = yield* plan(input.out, files)
    if (input.check) {
      if (changes.length === 0) return
      yield* list(changes, { create: "would create", update: "would update" })
      return yield* new CheckError({
        message: `${changes.length} generated ${changes.length === 1 ? "file is" : "files are"} out of date`
      })
    }
    yield* write(changes)
    yield* list(changes, { create: "created", update: "updated" })
  }))
)

// -----------------------------------------------------------------------------
// command
// -----------------------------------------------------------------------------

const root = Command.make("protoc-gen-effect", {}, () => plugin).pipe(
  Command.withDescription(
    "Generates Effect Schema modules from .proto files. Without arguments, it is a plugin for protoc and buf."
  ),
  Command.withSubcommands([generate])
)

/**
 * Runs the `protoc-gen-effect` command-line program.
 *
 * **Details**
 *
 * Written and, with `--check`, out-of-date files are listed on stdout, and
 * errors on stderr. Failures carry their exit code through
 * `Runtime.errorExitCode`; a `PlatformError` comes from reading or writing the
 * plugin's standard input and output.
 *
 * @stability experimental
 * @category running
 * @since 4.0.7
 */
export const run: Effect.Effect<
  void,
  CliError.CliError | DescriptorSetError | GenerateError | CheckError | PlatformError,
  Command.Environment
> = Command.run(root, { version: "0.0.0" }).pipe(
  Effect.mapError((error) =>
    CliError.isCliError(error) && Runtime.getErrorExitCode(error) !== 0
      ? Object.assign(error, { [Runtime.errorExitCode]: 2 })
      : error
  ),
  // Command.run has already printed CLI errors.
  Effect.tapError((error) => CliError.isCliError(error) ? Effect.void : Console.error(`error: ${error.message}`))
)
