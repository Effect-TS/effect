import type { LazyArg, Predicate } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrElse
 */
export function filterOrElse_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
): STM<R & R2, E | E2, A | A2> {
  return self.filterOrElseWith(f, orElse)
}

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @ets_data_first filterOrElse_
 */
export function filterOrElse<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>): STM<R & R2, E | E2, A | A2> =>
    self.filterOrElse(f, orElse)
}
