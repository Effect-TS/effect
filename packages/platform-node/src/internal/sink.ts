import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Sink from "effect/Sink"
import type { Writable } from "node:stream"
import type { FromWritableOptions } from "../Stream"
import { writeInput } from "./stream"

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
    Deferred.make<IE, void>(),
    (deferred) => {
      const input = writeInput<IE, A>(
        writable,
        (_) => Deferred.failCause(deferred, _),
        options,
        Deferred.complete(deferred, Effect.unit)
      )
      return Channel.embedInput(
        writableOutput(writable, deferred, onError),
        input
      )
    }
  )

const writableOutput = <IE, E>(
  writable: Writable | NodeJS.WritableStream,
  deferred: Deferred.Deferred<IE, void>,
  onError: (error: unknown) => E
) =>
  Effect.raceFirst(
    Effect.async<never, E, never>((resume) => {
      function handleError(err: unknown) {
        resume(Effect.fail(onError(err)))
      }
      writable.on("error", handleError)
      return Effect.sync(() => {
        writable.off("error", handleError)
      })
    }),
    Deferred.await(deferred)
  )
