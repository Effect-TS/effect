// Positive type assertions: this file must compile.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as FileSystem from "../../src/FileSystem.ts"
import { exists as nodeExists } from "../../src/node/exists.ts"
import { layer as nodeLayer } from "../../src/node/layer.ts"
import { readFile as nodeReadFile } from "../../src/node/readFile.ts"
import { stat as nodeStat } from "../../src/node/stat.ts"
import { sizeOf } from "../../src/program-readonly.ts"
import { backupViaRecord } from "../../src/program-record.ts"
import { exercise } from "../../src/program-twenty.ts"
import { backup } from "../../src/program.ts"
import * as Terminal from "../../src/Terminal.ts"

// A call adds the operation's key to R and keeps everything else from the shape.
export const read: Effect.Effect<Uint8Array, FileSystem.FileSystemError, "effect/FileSystem/readFile"> = FileSystem
  .readFile("a.txt")
export const scoped: Effect.Effect<
  string,
  FileSystem.FileSystemError,
  Scope.Scope | "effect/FileSystem/makeTempFileScoped"
> = FileSystem.makeTempFileScoped()
export const stream: Stream.Stream<Uint8Array, FileSystem.FileSystemError, "effect/FileSystem/stream"> = FileSystem
  .stream("a.txt")

// An operation is a slot: its identifier is its key string and its shape is the implementation type. It is not a
// `Context.Key`, which is a slot that is also an Effect.
export const asSlot: Context.Slot<
  "effect/FileSystem/readFile",
  (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError>
> = FileSystem.readFile
export const recordAsKey: Context.Key<FileSystem.FileSystem, FileSystem.Shape> = FileSystem.FileSystem
export const keyString: "effect/FileSystem/readFile" = FileSystem.readFile.key
export type ReadFileId = Context.Service.Identifier<typeof FileSystem.readFile> // "effect/FileSystem/readFile"
export const readFileId: ReadFileId = "effect/FileSystem/readFile"
export type ReadFileShape = Context.Service.Shape<typeof FileSystem.readFile>
export const readFileShape: ReadFileShape = () => Effect.succeed(new Uint8Array())

// A program's R is the union of the operations it calls.
export const program: Effect.Effect<
  number,
  FileSystem.FileSystemError,
  "effect/FileSystem/readFile" | "effect/FileSystem/writeFile"
> = backup("a.txt")

// An author can annotate with the record's identity instead: the public type then stays the same when an
// internal call is added, and callers must provide the whole file system.
export const stable: Effect.Effect<number, FileSystem.FileSystemError, FileSystem.FileSystem> = backup("a.txt")

// Providing an operation removes exactly its key; the operation is the key.
export const provided: Effect.Effect<number, FileSystem.FileSystemError, "effect/FileSystem/writeFile"> = backup(
  "a.txt"
).pipe(
  Effect.provideService(FileSystem.readFile, () => Effect.succeed(new Uint8Array()))
)
export const layer: Layer.Layer<"effect/FileSystem/readFile"> = Layer.succeed(
  FileSystem.readFile,
  () => Effect.succeed(new Uint8Array())
)
export const effectLayer: Layer.Layer<"effect/FileSystem/readFile"> = Layer.effect(
  FileSystem.readFile,
  Effect.succeed(() => Effect.succeed(new Uint8Array()))
)
export const runnable: Effect.Effect<number, FileSystem.FileSystemError, never> = backup("a.txt").pipe(
  Effect.provide(Layer.mergeAll(layer, Layer.succeed(FileSystem.writeFile, () => Effect.void)))
)
export const updated: Effect.Effect<number, FileSystem.FileSystemError, "effect/FileSystem/writeFile"> = provided.pipe(
  Effect.updateService(FileSystem.writeFile, (write) => write)
)
declare const context: Context.Context<"effect/FileSystem/readFile">
export const fromContext: (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError> = Context.get(
  context,
  FileSystem.readFile
)
export const picked: Context.Context<"effect/FileSystem/readFile"> = Context.pick(FileSystem.readFile)(context)
export const omitted: Context.Context<never> = Context.omit(FileSystem.readFile)(context)

// Yielding the implementation as a value goes through Effect.service, as for any key.
export const implementation: Effect.Effect<
  (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError>,
  never,
  "effect/FileSystem/readFile"
> = Effect.service(FileSystem.readFile)

// The record service: yielding it gives the record, and its requirement is the identity of the whole file system.
export const record: Effect.Effect<FileSystem.Shape, never, FileSystem.FileSystem> = FileSystem.FileSystem
export const viaRecord: Effect.Effect<number, FileSystem.FileSystemError, FileSystem.FileSystem> = backupViaRecord(
  "a.txt"
)

// A layer of the record provides every operation: the per-operation program runs under it...
export const underRecord: Effect.Effect<number, FileSystem.FileSystemError, never> = backup("a.txt").pipe(
  Effect.provide(nodeLayer)
)
// ...and the record program runs under the thirty operation layers merged, because `nodeLayer` is that merge,
// annotated `Layer<FileSystem>` in `node/layer.ts`.
export const recordUnderOperations: Effect.Effect<number, FileSystem.FileSystemError, never> = backupViaRecord("a.txt")
  .pipe(Effect.provide(nodeLayer))

// Layer.succeed, Layer.effect and Layer.mock on the record service type as they do for any key.
export const succeeded: Layer.Layer<FileSystem.FileSystem> = Layer.succeed(
  FileSystem.FileSystem,
  {} as FileSystem.Shape
)
export const mocked: Layer.Layer<FileSystem.FileSystem> = Layer.mock(FileSystem.FileSystem, {
  readFile: () => Effect.succeed(new Uint8Array())
})
export const members: Context.Slot<any, FileSystem.Shape["readFile"]> = FileSystem.FileSystem.members.readFile

// Twenty operations: the inferred requirement lists them all.
export const twenty: Effect.Effect<
  unknown,
  FileSystem.FileSystemError,
  | "effect/FileSystem/access"
  | "effect/FileSystem/copy"
  | "effect/FileSystem/copyFile"
  | "effect/FileSystem/exists"
  | "effect/FileSystem/lstat"
  | "effect/FileSystem/makeDirectory"
  | "effect/FileSystem/makeTempDirectory"
  | "effect/FileSystem/readDirectory"
  | "effect/FileSystem/readDirectoryEntries"
  | "effect/FileSystem/readFile"
  | "effect/FileSystem/readFileString"
  | "effect/FileSystem/realPath"
  | "effect/FileSystem/remove"
  | "effect/FileSystem/rename"
  | "effect/FileSystem/stat"
  | "effect/FileSystem/symlink"
  | "effect/FileSystem/truncate"
  | "effect/FileSystem/utimes"
  | "effect/FileSystem/writeFile"
  | "effect/FileSystem/writeFileString"
> = exercise("/")

// A generic shape that names its key keeps its type parameter.
export const parse = Context.Operation<
  <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "test/parse">
>()("test/parse")
export const parsed: Effect.Effect<number, never, "test/parse"> = parse(Number, "42")
export const parsedDate: Effect.Effect<Date, never, "test/parse"> = parse((input) => new Date(input), "2026-01-01")

// A generic shape whose type parameter is only in its parameters is derivable: nothing is lost.
export const log = Context.Operation<<A>(value: A) => Effect.Effect<void>>()("test/log")
export const logged: Effect.Effect<void, never, "test/log"> = log({ anything: true })

// An overloaded shape that names its key keeps both overloads.
export const format = Context.Operation<{
  (value: number): Effect.Effect<string, never, "test/format">
  (value: Date, locale: string): Effect.Effect<string, never, "test/format">
}>()("test/format")
export const formattedNumber: Effect.Effect<string, never, "test/format"> = format(1)
export const formattedDate: Effect.Effect<string, never, "test/format"> = format(new Date(), "en")

// The receiver of a shape is part of the call signature.
export const greet = Context.Operation<(this: { readonly prefix: string }, name: string) => Effect.Effect<string>>()(
  "test/greet"
)
export const greeter = { prefix: "hi", greet }
export const greeting: Effect.Effect<string, never, "test/greet"> = greeter.greet("x")

// A Stream operation is defined with Stream.Operation and its call is a plain Stream.
export const lines = Stream.Operation<(path: string) => Stream.Stream<string, FileSystem.FileSystemError>>()(
  "test/lines"
)
export const lineStream: Stream.Stream<string, FileSystem.FileSystemError, "test/lines"> = lines("a.txt")
export const linesLayer: Layer.Layer<"test/lines"> = Layer.succeed(lines, () => Stream.make("a"))

// Subset records. `ReadOnly` is a record over three of FileSystem's members; the facts below hold by assignability
// of unions, with no rule added for them.

// 1. the full record satisfies the subset
export const readOnlyFromFull: Layer.Layer<FileSystem.ReadOnly> = nodeLayer
// 2. the member layers merged satisfy the subset
export const readOnlyFromMembers: Layer.Layer<FileSystem.ReadOnly> = Layer.mergeAll(nodeExists, nodeReadFile, nodeStat)
// 3. the subset satisfies each of its members
declare const readOnlyLayer: Layer.Layer<FileSystem.ReadOnly>
export const memberFromReadOnly: Effect.Effect<Uint8Array, FileSystem.FileSystemError, never> = FileSystem.readFile("a")
  .pipe(Effect.provide(readOnlyLayer))
// 4. a program over three operations is assignable to the subset's name, and runs under either provider
export const readOnlyProgram: Effect.Effect<number, FileSystem.FileSystemError, FileSystem.ReadOnly> = sizeOf("a")
export const readOnlyUnderFull: Effect.Effect<number, FileSystem.FileSystemError, never> = sizeOf("a").pipe(
  Effect.provide(nodeLayer)
)
export const readOnlyUnderMembers: Effect.Effect<number, FileSystem.FileSystemError, never> = sizeOf("a").pipe(
  Effect.provide(readOnlyFromMembers)
)
// 5. the subset is a record service like any other
export const readOnlyRecord: Effect.Effect<FileSystem.ReadOnlyShape, never, FileSystem.ReadOnly> = FileSystem.ReadOnly
export const readOnlySucceeded: Layer.Layer<FileSystem.ReadOnly> = Layer.succeed(
  FileSystem.ReadOnly,
  {} as FileSystem.ReadOnlyShape
)

// Value operations: a member that is an Effect keeps its shape, and the standalone form is that Effect with the key
// added, so it reads the same standalone and through the record, and its implementation is an Effect in both.
export const width: Effect.Effect<number, never, "effect/Terminal/columns"> = Terminal.columns
export const input: Effect.Effect<
  Queue.Dequeue<Terminal.UserInput>,
  never,
  Scope.Scope | "effect/Terminal/readInput"
> = Terminal.readInput
export const widthSlot: Context.Slot<"effect/Terminal/columns", Effect.Effect<number>> = Terminal.columns
export const terminalRecord: Effect.Effect<Terminal.Shape, never, Terminal.Terminal> = Terminal.Terminal
export const columnsMember: Terminal.Shape["columns"] = Effect.succeed(80)
export const columnsLayer: Layer.Layer<"effect/Terminal/columns"> = Layer.succeed(Terminal.columns, Effect.succeed(80))
export const columnsOverride: Effect.Effect<number> = Terminal.columns.pipe(
  Effect.provideService(Terminal.columns, Effect.succeed(80))
)
export const terminalProgram: Effect.Effect<number, Terminal.TerminalError, Terminal.Terminal> = Effect.gen(
  function*() {
    const columns = yield* Terminal.columns
    yield* Terminal.display("x")
    return columns
  }
)

// A mixed record: a plain value and a synchronous function are ordinary services, an Effect-returning function is an
// operation, and the record is over all three. The record's identity and shape are what they would be for any key.
export const sep = Context.Service<string>("test/Path/sep")
export const join = Context.Service<(...parts: ReadonlyArray<string>) => string>("test/Path/join")
export const fromFileUrl = Context.Operation<(url: URL) => Effect.Effect<string, Error>>()("test/Path/fromFileUrl")
const pathMembers = { sep, join, fromFileUrl }
export type Path = Context.Operations.Identifier<typeof pathMembers>
export interface PathShape extends Context.Operations.Shape<typeof pathMembers> {}
export const Path = Context.Operations<Path, PathShape>()("test/Path", pathMembers)
export const pathIdentity: Path = "test/Path/fromFileUrl" as string | "test/Path/fromFileUrl"
export const separator: Effect.Effect<string, never, string> = sep
export const converted: Effect.Effect<string, Error, "test/Path/fromFileUrl"> = fromFileUrl(new URL("file:///a"))
export const pathRecord: Effect.Effect<
  {
    readonly sep: string
    readonly join: (...parts: ReadonlyArray<string>) => string
    readonly fromFileUrl: (url: URL) => Effect.Effect<string, Error>
  },
  never,
  Path
> = Path
export const pathLayer: Layer.Layer<Path> = Layer.succeed(Path, {
  sep: "/",
  join: (...parts) => parts.join("/"),
  fromFileUrl: (url) => Effect.succeed(url.pathname)
})
export const pathFromMembers: Layer.Layer<Path> = Layer.mergeAll(
  Layer.succeed(sep, "/"),
  Layer.succeed(join, (...parts) => parts.join("/")),
  Layer.succeed(fromFileUrl, (url) => Effect.succeed(url.pathname))
)

// A record may be a member of a record: its slots are spread the same way, and the identity is the union.
const platformMembers = { fs: FileSystem.ReadOnly, terminal: Terminal.Terminal }
export type Platform = Context.Operations.Identifier<typeof platformMembers>
export interface PlatformShape extends Context.Operations.Shape<typeof platformMembers> {}
export const Platform = Context.Operations<Platform, PlatformShape>()("test/Platform", platformMembers)
export const platformIdentity: Platform = "effect/Terminal/rows" as FileSystem.ReadOnly | Terminal.Terminal
export const platformUnderParts: Effect.Effect<PlatformShape, never, never> = Platform.pipe(
  Effect.provide(readOnlyFromMembers),
  Effect.provide(Layer.succeed(Terminal.Terminal, {} as Terminal.Shape))
)

// Without declared names, the record's identifier and shape are inferred from the members.
export const Inferred = Context.Operations("test/Inferred", {
  readFile: FileSystem.readFile,
  exists: FileSystem.exists
})
// With the identifier declared and the shape left to the members: the two-declaration form.
const namedMembers = { readFile: FileSystem.readFile, exists: FileSystem.exists }
export type Named = Context.Operations.Identifier<typeof namedMembers>
export const Named = Context.Operations<Named>()("test/Named", namedMembers)
export const namedShape: Context.Service.Shape<typeof Named> = {
  readFile: () => Effect.succeed(new Uint8Array()),
  exists: () => Effect.succeed(true)
}
export const namedLayer: Layer.Layer<Named> = Layer.mergeAll(nodeReadFile, nodeExists)
// The annotated form still works for the inferred identity and a shape interface over the same members.
export const Annotated: Context.Operations<Named, Context.Operations.Shape<typeof namedMembers>> = Context.Operations(
  "test/Annotated",
  namedMembers
)
export const inferredIdentity: Context.Service.Identifier<typeof Inferred> = "effect/FileSystem/exists" as
  | "effect/FileSystem/readFile"
  | "effect/FileSystem/exists"
export const inferredShape: Context.Service.Shape<typeof Inferred> = {
  readFile: () => Effect.succeed(new Uint8Array()),
  exists: () => Effect.succeed(true)
}
export const inferredFromMembers: Layer.Layer<Context.Service.Identifier<typeof Inferred>> = Layer.mergeAll(
  nodeReadFile,
  nodeExists
)

// A declared identifier may be wider than the members' union: the record keeps an identity of its own, which the
// member layers do not satisfy, while a layer of the record still satisfies every member. This is the phase 0 shape
// of an existing record service.
export interface Legacy {
  readonly _: unique symbol
}
export const Legacy = Context.Operations<Legacy | FileSystem.ReadOnly, FileSystem.ReadOnlyShape>()("test/Legacy", {
  exists: FileSystem.exists,
  readFile: FileSystem.readFile,
  stat: FileSystem.stat
})
export const legacyLayer: Layer.Layer<Legacy | FileSystem.ReadOnly> = Layer.succeed(
  Legacy,
  {} as FileSystem.ReadOnlyShape
)
export const legacySatisfiesMember: Effect.Effect<Uint8Array, FileSystem.FileSystemError, never> = FileSystem
  .readFile("a").pipe(Effect.provide(legacyLayer))
export const legacySatisfiesOldRequirement: Effect.Effect<FileSystem.ReadOnlyShape, never, never> = Legacy.pipe(
  Effect.provide(legacyLayer)
)
declare const legacyRequirement: Effect.Effect<void, never, Legacy>
export const legacyOld: Effect.Effect<void, never, never> = legacyRequirement.pipe(Effect.provide(legacyLayer))

// A Sink operation, from Sink.Operation.
export const collect = Sink.Operation<(label: string) => Sink.Sink<Array<string>, string>>()("test/collect")
export const collected: Sink.Sink<Array<string>, string, never, never, "test/collect"> = collect("x")
