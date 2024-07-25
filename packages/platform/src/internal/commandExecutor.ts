import * as Brand from "effect/Brand"
import * as Chunk from "effect/Chunk"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import type * as _CommandExecutor from "../CommandExecutor.js"

/** @internal */
export const TypeId: _CommandExecutor.TypeId = Symbol.for("@effect/platform/CommandExecutor") as _CommandExecutor.TypeId

/** @internal */
export const ProcessTypeId: _CommandExecutor.ProcessTypeId = Symbol.for(
  "@effect/platform/Process"
) as _CommandExecutor.ProcessTypeId

/** @internal */
export const ExitCode = Brand.nominal<_CommandExecutor.ExitCode>()

/** @internal */
export const ProcessId = Brand.nominal<_CommandExecutor.Process.Id>()

/** @internal */
export const CommandExecutor = GenericTag<_CommandExecutor.CommandExecutor>("@effect/platform/CommandExecutor")

/** @internal */
export const makeExecutor = (start: _CommandExecutor.CommandExecutor["start"]): _CommandExecutor.CommandExecutor => {
  const stream: _CommandExecutor.CommandExecutor["stream"] = (command) =>
    Stream.unwrapScoped(Effect.map(start(command), (process) => process.stdout))
  const streamLines: _CommandExecutor.CommandExecutor["streamLines"] = (command, encoding) => {
    const decoder = new TextDecoder(encoding)
    return Stream.splitLines(
      Stream.mapChunks(stream(command), Chunk.map((bytes) => decoder.decode(bytes)))
    )
  }
  return {
    [TypeId]: TypeId,
    start,
    exitCode: (command) => Effect.scoped(Effect.flatMap(start(command), (process) => process.exitCode)),
    stream,
    string: (command, encoding = "utf-8") => {
      const decoder = new TextDecoder(encoding)
      return pipe(
        start(command),
        Effect.flatMap((process) => Stream.run(process.stdout, collectUint8Array)),
        Effect.map((bytes) => decoder.decode(bytes)),
        Effect.scoped
      )
    },
    lines: (command, encoding = "utf-8") => {
      return pipe(
        streamLines(command, encoding),
        Stream.runCollect,
        Effect.map(Chunk.toArray)
      )
    },
    streamLines
  }
}

const collectUint8Array: Sink.Sink<Uint8Array, Uint8Array> = Sink.foldLeftChunks(
  new Uint8Array(),
  (bytes, chunk: Chunk.Chunk<Uint8Array>) =>
    Chunk.reduce(chunk, bytes, (acc, curr) => {
      const newArray = new Uint8Array(acc.length + curr.length)
      newArray.set(acc)
      newArray.set(curr, acc.length)
      return newArray
    })
)
