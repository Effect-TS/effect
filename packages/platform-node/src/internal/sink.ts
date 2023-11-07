import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Sink from "effect/Sink"
import type { Writable } from "node:stream"
import type { FromWritableOptions } from "../Stream.js"
import { writeInput } from "./stream.js"

/** @internal */
export const fromWritable = <E, A = Uint8Array | string>(
  evaluate: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => E,
  options: FromWritableOptions = {}
): Sink.Sink<never, E, A, never, void> =>
  Sink.suspend(() => Sink.fromChannel(writeChannel(evaluate(), onError, options)))

const writeChannel = <IE, OE, A>(
  writable: Writable | NodeJS.WritableStream,
  onError: (error: unknown) => OE,
  options: FromWritableOptions = {}
): Channel.Channel<never, IE, Chunk.Chunk<A>, unknown, IE | OE, Chunk.Chunk<never>, void> =>
  Channel.flatMap(
    Deferred.make<IE | OE, void>(),
    (deferred) =>
      Channel.embedInput(
        writableOutput(writable, deferred, onError),
        writeInput<IE, A>(
          writable,
          (cause) => Deferred.failCause(deferred, cause),
          options,
          Deferred.complete(deferred, Effect.unit)
        )
      )
  )

const writableOutput = <IE, E>(
  writable: Writable | NodeJS.WritableStream,
  deferred: Deferred.Deferred<IE | E, void>,
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
