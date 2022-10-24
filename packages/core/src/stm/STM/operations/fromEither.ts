import type * as Either from "@fp-ts/data/Either"

/**
 * Lifts an `Either` into a `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops fromEither
 * @category conversions
 * @since 1.0.0
 */
export function fromEither<E, A>(either: Either.Either<E, A>): STM<never, E, A> {
  return STM.suspend(() => {
    switch (either._tag) {
      case "Left": {
        return STM.fail(either.left)
      }
      case "Right": {
        return STM.succeed(either.right)
      }
    }
  })
}
