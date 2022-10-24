import type { Either } from "@fp-ts/data/Either"
import * as List from "@fp-ts/data/List"

/**
 * Split a stream by a predicate. The faster stream may advance by up to
 * buffer elements further than the slower one.
 *
 * @tsplus static effect/core/stream/Stream.Aspects partitionEither
 * @tsplus pipeable effect/core/stream/Stream partitionEither
 * @category mutations
 * @since 1.0.0
 */
export function partitionEither<A, R2, E2, A2, A3>(
  p: (a: A) => Effect<R2, E2, Either<A2, A3>>,
  buffer = 16
) {
  return <R, E>(self: Stream<R, E, A>): Effect<
    R | R2 | Scope,
    E | E2,
    readonly [Stream<never, E | E2, A2>, Stream<never, E | E2, A3>]
  > =>
    self
      .mapEffect(p)
      .distributedWith(2, buffer, (either) => {
        switch (either._tag) {
          case "Left": {
            return Effect.succeed((n) => n === 0)
          }
          case "Right": {
            return Effect.succeed((n) => n === 1)
          }
        }
      })
      .flatMap((dequeues) => {
        if (List.isCons(dequeues) && List.isCons(dequeues.tail)) {
          return Effect.succeed([
            Stream.fromQueueWithShutdown(dequeues.head)
              .flattenExitOption
              .collectLeft,
            Stream.fromQueueWithShutdown(dequeues.tail.head)
              .flattenExitOption
              .collectRight
          ])
        }
        return Effect.dieMessage("Stream.partitionEither: expected two streams")
      })
}
