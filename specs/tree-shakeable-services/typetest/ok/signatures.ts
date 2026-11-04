// Positive type assertions: this file must compile.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as FileSystem from "../../src/FileSystem.ts"
import { Operation } from "../../src/Operation.ts"
import { backup } from "../../src/program.ts"

// A call adds the operation's key to R and keeps everything else from the shape.
export const read: Effect.Effect<Uint8Array, FileSystem.FileSystemError, "effect/FileSystem/readFile"> = FileSystem
  .readFile(
    "a.txt"
  )
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

// Yielding the service gives the implementation, typed as the shape.
export const implementation: Effect.Effect<
  (path: string) => Effect.Effect<Uint8Array, FileSystem.FileSystemError>,
  never,
  "effect/FileSystem/readFile"
> = Effect.map(FileSystem.readFile.service, (current) => current)

// A generic shape that names its key keeps its type parameter.
export const parse = Operation<
  <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "test/parse">
>()(
  "test/parse"
)
export const parsed: Effect.Effect<number, never, "test/parse"> = parse(Number, "42")
export const parsedDate: Effect.Effect<Date, never, "test/parse"> = parse((input) => new Date(input), "2026-01-01")

// An overloaded shape that names its key keeps both overloads.
export const format = Operation<{
  (value: number): Effect.Effect<string, never, "test/format">
  (value: Date, locale: string): Effect.Effect<string, never, "test/format">
}>()("test/format")
export const formattedNumber: Effect.Effect<string, never, "test/format"> = format(1)
export const formattedDate: Effect.Effect<string, never, "test/format"> = format(new Date(), "en")

// The receiver of a shape is part of the call signature.
export const greet = Operation<(this: { readonly prefix: string }, name: string) => Effect.Effect<string>>()(
  "test/greet"
)
export const greeter = { prefix: "hi", greet }
export const greeting: Effect.Effect<string, never, "test/greet"> = greeter.greet("x")
