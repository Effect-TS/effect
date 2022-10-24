import type { Either } from "@fp-ts/data/Either"

/**
 * Fails with given error 'e' if value is `Right`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects leftOrFail
 * @tsplus pipeable effect/core/stream/Stream leftOrFail
 * @category getters
 * @since 1.0.0
 */
export function leftOrFail<E2>(e: LazyArg<E2>) {
  return <R, E, A, A2>(self: Stream<R, E, Either<A, A2>>): Stream<R, E | E2, A> =>
    self.mapEffect((either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.succeed(either.left)
        }
        case "Right": {
          return Effect.failSync(e)
        }
      }
    })
}
