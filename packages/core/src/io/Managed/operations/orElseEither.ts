import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @tsplus fluent ets/Managed orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: LazyArg<Managed<R2, E2, A2>>,
  __tsplusTrace?: string
): Managed<R & R2, E2, Either<A2, A>> {
  return self.foldManaged(
    () => that().map(Either.left),
    (a) => Managed.succeedNow(Either.right(a))
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(
  that: LazyArg<Managed<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E2, Either<A2, A>> =>
    orElseEither_(self, that)
}
