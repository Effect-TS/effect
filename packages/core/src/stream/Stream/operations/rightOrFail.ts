import type { Either } from "@fp-ts/data/Either"

/**
 * Fails with given error 'e' if value is `Left`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects rightOrFail
 * @tsplus pipeable effect/core/stream/Stream rightOrFail
 * @category getters
 * @since 1.0.0
 */
export function rightOrFail<R, E, E2, A1, A2>(error: LazyArg<E2>) {
  return (self: Stream<R, E, Either<A1, A2>>): Stream<R, E | E2, A2> =>
    self.mapEffect((either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.failSync(error)
        }
        case "Right": {
          return Effect.succeed(either.right)
        }
      }
    })
}
