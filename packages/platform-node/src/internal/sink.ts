import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Sink from "effect/Sink"
import type { Writable } from "node:stream"
import type { FromWritableOptions } from "../Stream"
import { writeEffect } from "./stream"

/** @internal */
export const fromWritable = <E, A = Uint8Array>(
  evaluate: LazyArg<Writable>,
  onError: (error: unknown) => E,
  options: FromWritableOptions = {}
): Sink.Sink<never, E, A, never, void> =>
  Sink.suspend(() => Sink.fromChannel(writeChannel(evaluate(), onError, options)))

const writeChannel = <IE, OE, A>(
  writable: Writable,
  onError: (error: unknown) => OE,
  { encoding, endOnDone = true }: FromWritableOptions = {}
): Channel.Channel<never, IE, Chunk.Chunk<A>, unknown, IE | OE, Chunk.Chunk<never>, void> => {
  const write = writeEffect(writable, onError, encoding)
  const close = endOnDone ?
    Effect.async<never, never, void>((resume) => {
      if (writable.closed) {
        resume(Effect.unit)
      } else {
        writable.end(() => resume(Effect.unit))
      }
    }) :
    Channel.unit

  const loop: Channel.Channel<never, IE, Chunk.Chunk<A>, unknown, OE | IE, Chunk.Chunk<never>, void> = Channel
    .readWithCause({
      onInput: (chunk: Chunk.Chunk<A>) => Channel.flatMap(Channel.fromEffect(write(chunk)), () => loop),
      onFailure: (cause) => Channel.zipRight(close, Channel.failCause(cause)),
      onDone: (_done) => close
    })
  return loop
}
