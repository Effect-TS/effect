import type { LazyArg, Predicate } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Fails with the specified error if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrFail
 */
export function filterOrFail_<R, E, E1, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  e: LazyArg<E1>
): STM<R, E | E1, A> {
  return self.filterOrElse(f, STM.fail(e))
}

/**
 * Fails with the specified error if the predicate fails.
 *
 * @ets_data_first filterOrFail_
 */
export function filterOrFail<A, E1>(f: Predicate<A>, e: LazyArg<E1>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> => self.filterOrFail(f, e)
}
