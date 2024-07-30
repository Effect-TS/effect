import * as Brand from "effect/Brand"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import type * as CommandExecutor from "../CommandExecutor.js"

/** @internal */
export const TypeId: CommandExecutor.TypeId = Symbol.for(
  "@effect/platform/CommandExecutor"
) as CommandExecutor.TypeId

/** @internal */
export const ProcessTypeId: CommandExecutor.ProcessTypeId = Symbol.for(
  "@effect/platform/Process"
) as CommandExecutor.ProcessTypeId

/** @internal */
export const ExitCode = Brand.nominal<CommandExecutor.ExitCode>()

/** @internal */
export const ProcessId = Brand.nominal<CommandExecutor.Process.Id>()

/** @internal */
export const makeExecutor = (
  start: typeof CommandExecutor.CommandExecutor.Service["start"]
): typeof CommandExecutor.CommandExecutor.Service => {
  const stream: typeof CommandExecutor.CommandExecutor.Service["stream"] = (command) =>
    Stream.unwrapScoped(Effect.map(start(command), (process) => process.stdout))
  const streamLines: typeof CommandExecutor.CommandExecutor.Service["streamLines"] = (command, encoding) => {
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
        Effect.map(Chunk.toReadonlyArray)
      )
    },
    streamLines
  } as const
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
