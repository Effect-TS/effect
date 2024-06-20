/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Runtime from "effect/Runtime"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 */
export const asyncPauseResume = <A, E = never, R = never>(
  register: (emit: {
    readonly single: (item: A) => void
    readonly chunk: (chunk: Chunk.Chunk<A>) => void
    readonly array: (chunk: ReadonlyArray<A>) => void
    readonly fail: (error: E) => void
    readonly end: () => void
  }) => {
    readonly onInterrupt: Effect.Effect<void, never, R>
    readonly onPause: Effect.Effect<void>
    readonly onResume: Effect.Effect<void>
  },
  bufferSize = 2
): Stream.Stream<A, E, R> => {
  const EOF = Symbol()
  return Effect.all([
    Queue.bounded<Chunk.Chunk<A> | typeof EOF>(bufferSize),
    Deferred.make<never, Option.Option<E>>(),
    Effect.runtime<never>()
  ]).pipe(
    Effect.flatMap(([queue, deferred, runtime]) => {
      return Effect.async<never, Option.Option<E>, R>((cb) => {
        const runFork = Runtime.runFork(runtime)

        // eslint-disable-next-line prefer-const
        let effects: {
          readonly onInterrupt: Effect.Effect<void, never, R>
          readonly onPause: Effect.Effect<void>
          readonly onResume: Effect.Effect<void>
        }

        const offer = (chunk: Chunk.Chunk<A>) =>
          Queue.isFull(queue).pipe(
            Effect.tap((full) => (full ? effects.onPause : Effect.void)),
            Effect.zipRight(Queue.offer(queue, chunk)),
            Effect.zipRight(effects.onResume)
          )

        effects = register({
          single: (item) => runFork(offer(Chunk.of(item))),
          chunk: (chunk) => runFork(offer(chunk)),
          array: (chunk) => runFork(offer(Chunk.unsafeFromArray(chunk))),
          fail: (error) => cb(Effect.fail(Option.some(error))),
          end: () => cb(Effect.fail(Option.none()))
        })

        return effects.onInterrupt
      }).pipe(
        Effect.ensuring(Queue.offer(queue, EOF)),
        Effect.intoDeferred(deferred),
        Effect.forkScoped,
        Effect.as(
          Stream.repeatEffectChunkOption(
            Effect.flatMap(
              Queue.take(queue),
              (chunk) => chunk === EOF ? Deferred.await(deferred) : Effect.succeed(chunk)
            )
          )
        )
      )
    }),
    Stream.unwrapScoped
  )
}
