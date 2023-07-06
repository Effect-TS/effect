import * as Brand from "@effect/data/Brand"
import * as Chunk from "@effect/data/Chunk"
import { Tag } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type * as _CommandExecutor from "@effect/platform/CommandExecutor"
import * as Sink from "@effect/stream/Sink"
import * as Stream from "@effect/stream/Stream"

/** @internal */
export const ProcessTypeId: _CommandExecutor.ProcessTypeId = Symbol.for(
  "@effect/platform/Process"
) as _CommandExecutor.ProcessTypeId

/** @internal */
export const ExitCode = Brand.nominal<_CommandExecutor.ExitCode>()

/** @internal */
export const ProcessId = Brand.nominal<_CommandExecutor.Process.Id>()

/** @internal */
export const CommandExecutor = Tag<_CommandExecutor.CommandExecutor>()

/** @internal */
export const makeExecutor = (start: _CommandExecutor.CommandExecutor["start"]): _CommandExecutor.CommandExecutor => {
  const streamLines: _CommandExecutor.CommandExecutor["streamLines"] = (command, encoding) => {
    const decoder = new TextDecoder(encoding)
    return pipe(
      Stream.fromEffect(start(command)),
      Stream.flatMap((process) =>
        pipe(
          process.stdout,
          Stream.mapChunks(Chunk.map((bytes) => decoder.decode(bytes))),
          Stream.splitLines
        )
      )
    )
  }
  return {
    start,
    exitCode: (command) => Effect.flatMap(start(command), (process) => process.exitCode),
    stream: (command) =>
      pipe(
        Stream.fromEffect(start(command)),
        Stream.flatMap((process) => process.stdout)
      ),
    string: (command, encoding = "utf-8") => {
      const decoder = new TextDecoder(encoding)
      return pipe(
        start(command),
        Effect.flatMap((process) => Stream.run(process.stdout, collectUint8Array)),
        Effect.map((bytes) => decoder.decode(bytes))
      )
    },
    lines: (command, encoding = "utf-8") => {
      return pipe(
        streamLines(command, encoding),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
    },
    streamLines
  }
}

const collectUint8Array: Sink.Sink<never, never, Uint8Array, never, Uint8Array> = Sink.foldLeftChunks(
  new Uint8Array(),
  (bytes, chunk: Chunk.Chunk<Uint8Array>) =>
    Chunk.reduce(chunk, bytes, (acc, curr) => {
      const newArray = new Uint8Array(acc.length + curr.length)
      newArray.set(acc)
      newArray.set(curr, acc.length)
      return newArray
    })
)
