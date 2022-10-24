import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Filters any `Right` values.
 *
 * @tsplus getter effect/core/stream/Stream collectLeft
 * @category mutations
 * @since 1.0.0
 */
export function collectLeft<R, E, L, A>(
  self: Stream<R, E, Either.Either<L, A>>
): Stream<R, E, L> {
  return self.collect((either) => Either.isLeft(either) ? Option.some(either.left) : Option.none)
}
