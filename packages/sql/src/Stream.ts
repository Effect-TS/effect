/**
 * @since 1.0.0
 */
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Runtime from "effect/Runtime"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 */
export const asyncPauseResume = <R, E, A>(
  register: (emit: {
    readonly single: (item: A) => void
    readonly fail: (error: E) => void
    readonly end: () => void
  }) => {
    readonly onInterrupt: Effect.Effect<void, never, R>
    readonly onPause: Effect.Effect<void>
    readonly onResume: Effect.Effect<void>
  },
  bufferSize = 16
): Stream.Stream<A, E, R> =>
  Effect.all([
    Effect.acquireRelease(Queue.bounded<A>(bufferSize), Queue.shutdown),
    Deferred.make<never, Option.Option<E>>(),
    Effect.runtime<never>()
  ]).pipe(
    Effect.flatMap(([queue, deferred, runtime]) => {
      const takeOnEmpty = Effect.raceFirst(
        Deferred.await(deferred),
        Queue.takeBetween(queue, 1, bufferSize)
      )
      const take = Queue.takeBetween(queue, 1, bufferSize)

      return Effect.async<never, Option.Option<E>, R>((cb) => {
        const runFork = Runtime.runFork(runtime)

        // eslint-disable-next-line prefer-const
        let effects: {
          readonly onInterrupt: Effect.Effect<void, never, R>
          readonly onPause: Effect.Effect<void>
          readonly onResume: Effect.Effect<void>
        }

        const offer = (row: A) =>
          Queue.isFull(queue).pipe(
            Effect.tap((full) => (full ? effects.onPause : Effect.unit)),
            Effect.zipRight(Queue.offer(queue, row)),
            Effect.zipRight(effects.onResume)
          )

        effects = register({
          single: (item) => runFork(offer(item)),
          fail: (error) => cb(Effect.fail(Option.some(error))),
          end: () => cb(Effect.fail(Option.none()))
        })

        return effects.onInterrupt
      }).pipe(
        Effect.intoDeferred(deferred),
        Effect.forkScoped,
        Effect.as(
          Stream.repeatEffectChunkOption(
            Queue.isEmpty(queue).pipe(
              Effect.flatMap((empty) => (empty ? takeOnEmpty : take))
            )
          )
        )
      )
    }),
    Stream.unwrapScoped
  )
