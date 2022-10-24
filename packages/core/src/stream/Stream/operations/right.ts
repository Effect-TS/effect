import type { Either } from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Fails with the error `None` if value is `Left`.
 *
 * @tsplus getter effect/core/stream/Stream right
 * @category getters
 * @since 1.0.0
 */
export function right<R, E, A1, A2>(
  self: Stream<R, E, Either<A1, A2>>
): Stream<R, Option.Option<E>, A2> {
  return self.mapError(Option.some).rightOrFail(Option.none)
}
