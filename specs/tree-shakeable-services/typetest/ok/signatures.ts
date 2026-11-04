// Positive type assertions: this file must compile.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as FileSystem from "../../src/FileSystem.ts"
import { layer as nodeLayer } from "../../src/node/layer.ts"
import { backupViaRecord } from "../../src/program-record.ts"
import { exercise } from "../../src/program-twenty.ts"
import { backup } from "../../src/program.ts"

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

// A program's R is the union of the operations it calls.
export const program: Effect.Effect<
  number,
  FileSystem.FileSystemError,
  "effect/FileSystem/readFile" | "effect/FileSystem/writeFile"
> = backup("a.txt")

// An author can annotate with the record's identity instead: the public type then stays the same when an
// internal call is added, and callers must provide the whole file system.
export const stable: Effect.Effect<number, FileSystem.FileSystemError, FileSystem.FileSystem> = backup("a.txt")

// Providing an operation's service removes exactly its key.
export const provided: Effect.Effect<number, FileSystem.FileSystemError, "effect/FileSystem/writeFile"> = backup(
  "a.txt"
).pipe(
  Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(new Uint8Array()))
)
export const layer: Layer.Layer<"effect/FileSystem/readFile"> = Layer.succeed(
  FileSystem.readFile.service,
  () => Effect.succeed(new Uint8Array())
)
export const runnable: Effect.Effect<number, FileSystem.FileSystemError, never> = backup("a.txt").pipe(
  Effect.provide(Layer.mergeAll(layer, Layer.succeed(FileSystem.writeFile.service, () => Effect.void)))
)

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

// Yielding the service gives the implementation, typed as the shape.
export const implementation: Effect.Effect<
  (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError>,
  never,
  "effect/FileSystem/readFile"
> = Effect.map(FileSystem.readFile.service, (current) => current)

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
