import type { Either } from "../../Either"
import { left, right } from "../../Either"
import type { Managed } from "../definition"
import { foldManaged_ } from "./foldManaged"
import { map_ } from "./map"
import { succeedNow } from "./succeedNow"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E2, Either<A2, A>> {
  return foldManaged_(
    self,
    () => map_(that(), left),
    (a) => succeedNow(right(a)),
    __trace
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(
  that: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E2, Either<A2, A>> =>
    orElseEither_(self, that, __trace)
}
