import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Sink from "effect/Sink"
import type { Writable } from "node:stream"
import type { FromWritableOptions } from "../NodeStream.js"
import { writeInput } from "./stream.js"

/** @internal */
export const fromWritable = <E, A = Uint8Array | string>(
  evaluate: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => E,
  options?: FromWritableOptions
): Sink.Sink<void, A, never, E> => Sink.fromChannel(fromWritableChannel(evaluate, onError, options))

/** @internal */
export const fromWritableChannel = <IE, OE, A>(
  writable: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => OE,
  options?: FromWritableOptions
): Channel.Channel<Chunk.Chunk<never>, Chunk.Chunk<A>, IE | OE, IE, void, unknown> =>
  Channel.flatMap(
    Effect.zip(
      Effect.sync(() => writable()),
      Deferred.make<void, IE | OE>()
    ),
    ([writable, deferred]) =>
      Channel.embedInput(
        writableOutput(writable, deferred, onError),
        writeInput<IE, A>(
          writable,
          (cause) => Deferred.failCause(deferred, cause),
          options,
          Deferred.complete(deferred, Effect.void)
        )
      )
  )

const writableOutput = <IE, E>(
  writable: Writable | NodeJS.WritableStream,
  deferred: Deferred.Deferred<void, IE | E>,
  onError: (error: unknown) => E
) =>
  Effect.suspend(() => {
    function handleError(err: unknown) {
      Deferred.unsafeDone(deferred, Effect.fail(onError(err)))
    }
    writable.on("error", handleError)
    return Effect.ensuring(
      Deferred.await(deferred),
      Effect.sync(() => {
        writable.removeListener("error", handleError)
      })
    )
  })
