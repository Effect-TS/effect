import type { LazyArg, Predicate } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrDie
 */
export function filterOrDie_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>
): STM<R, E, A> {
  return self.filterOrElse(f, STM.die(defect))
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @ets_data_first filterOrDie_
 */
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>
): <R, E>(self: STM<R, E, A>) => STM<R, E, A> {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrDie(f, defect)
}
