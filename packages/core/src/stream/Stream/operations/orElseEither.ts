import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../definition"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus fluent ets/Stream orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, Either<A, A2>> {
  return self.map(Either.left) | that().map(Either.right)
}

export const orElseEither = Pipeable(orElseEither_)
