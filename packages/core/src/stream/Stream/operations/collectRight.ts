import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Filters any `Left` values.
 *
 * @tsplus getter effect/core/stream/Stream collectRight
 * @category mutations
 * @since 1.0.0
 */
export function collectRight<R, E, L, A>(
  self: Stream<R, E, Either.Either<L, A>>
): Stream<R, E, A> {
  return self.collect((either) => Either.isRight(either) ? Option.some(either.right) : Option.none)
}
