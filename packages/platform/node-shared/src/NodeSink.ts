/**
 * Sink adapters for writing Effect chunks into Node writable streams.
 *
 * `fromWritable` creates a `Sink`, `fromWritableChannel` creates a lower-level
 * `Channel`, and `pullIntoWritable` writes from an existing pull loop. All
 * three adapters respect writable-stream backpressure, map writable errors with
 * the supplied `onError` function, and can end the writable when the upstream
 * data is done.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { constVoid, identity, type LazyArg } from "effect/Function"
import * as Pull from "effect/Pull"
import * as Sink from "effect/Sink"
import { finished, type Writable } from "node:stream"
import { destroyStream } from "./internal/stream.ts"

/**
 * Creates a `Sink` that writes chunks to a Node writable stream, respecting
 * backpressure and mapping writable errors with `onError`. Unless `endOnDone`
 * is `false`, the writable is ended on completion and destroyed on upstream
 * failure or interruption.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromWritable = <E, A = Uint8Array | string>(
  options: {
    readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>
    readonly onError: (error: unknown) => E
    readonly endOnDone?: boolean | undefined
    readonly encoding?: BufferEncoding | undefined
  }
): Sink.Sink<void, A, never, E> =>
  Sink.fromChannel(Channel.mapDone(fromWritableChannel<never, E, A>(options), (_) => [_]))

/**
 * Creates a `Channel` that pulls chunks from upstream and writes them to a
 * Node writable stream, respecting backpressure. Unless `endOnDone` is
 * `false`, the writable is ended when upstream is done and destroyed on
 * upstream failure or interruption.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromWritableChannel = <IE, E, A = Uint8Array | string>(
  options: {
    readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>
    readonly onError: (error: unknown) => E
    readonly endOnDone?: boolean | undefined
    readonly encoding?: BufferEncoding | undefined
  }
): Channel.Channel<never, IE | E, void, NonEmptyReadonlyArray<A>, IE> =>
  Channel.fromTransform((pull: Pull.Pull<NonEmptyReadonlyArray<A>, IE, unknown>) => {
    const writable = options.evaluate() as Writable
    const write = pullIntoWritable({ ...options, writable, pull })
    return Effect.succeed(
      options.endOnDone === false
        ? write
        : Effect.onError(write, (cause) => Pull.isDoneCause(cause) ? Effect.void : releaseWritable(writable))
    )
  })

// Destroy the writable and wait for destruction to settle, keeping any
// destruction error handled.
const releaseWritable = (writable: Writable): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const onDestroyed = () => resume(Effect.void)
    if (writable.closed) {
      // Destruction may be complete with its error still queued.
      const cleanup = finished(writable, { readable: false }, () => {
        cleanup()
        onDestroyed()
      })
    } else {
      destroyStream(writable, constVoid, onDestroyed)
    }
  })

/**
 * Writes Effect chunks into a Node writable stream.
 *
 * **When to use**
 *
 * Use to implement custom Node stream adapters that already have an upstream
 * pull and need direct control over a writable stream.
 *
 * **Details**
 *
 * The loop waits for `drain` when needed, fails on writable errors, and ends
 * the writable on upstream completion unless `endOnDone` is `false`.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const pullIntoWritable = <A, IE, E>(options: {
  readonly pull: Pull.Pull<NonEmptyReadonlyArray<A>, IE, unknown>
  readonly writable: Writable
  readonly onError: (error: unknown) => E
  readonly endOnDone?: boolean | undefined
  readonly encoding?: BufferEncoding | undefined
}): Pull.Pull<never, IE | E, unknown> =>
  Effect.suspend(() => {
    const completion = Deferred.makeUnsafe<void>()
    const failure = Deferred.makeUnsafe<never, E>()
    const onError = (error: unknown) => Deferred.doneUnsafe(failure, Effect.failSync(() => options.onError(error)))
    // finished() only reports once, so keep listening for errors from writes
    // made after the writable has finished.
    options.writable.on("error", onError)
    const cleanup = finished(options.writable, { readable: false }, (error) => {
      if (error) {
        onError(error)
      } else {
        Deferred.doneUnsafe(completion, Effect.void)
      }
    })
    return options.pull.pipe(
      Effect.flatMap((chunk) => {
        let i = 0
        return Effect.callback<void, E>((resume) => {
          let cancelled = false
          const loop = () => {
            for (; i < chunk.length;) {
              if (cancelled) {
                return
              }
              const success = options.writable.write(chunk[i++], options.encoding as any)
              if (!success) {
                if (!cancelled) {
                  options.writable.once("drain", loop)
                }
                return
              }
            }
            if (!cancelled) {
              resume(Effect.void)
            }
          }
          loop()
          return Effect.sync(() => {
            cancelled = true
            options.writable.off("drain", loop)
          })
        })
      }),
      Effect.forever({ disableYield: true }),
      options.endOnDone !== false ?
        Pull.catchDone((_) => {
          options.writable.end()
          return Effect.andThen(Deferred.await(completion), Cause.done(_))
        }) :
        identity,
      Effect.raceFirst(Deferred.await(failure)),
      Effect.ensuring(Effect.sync(() => {
        cleanup()
        options.writable.off("error", onError)
      }))
    )
  })
