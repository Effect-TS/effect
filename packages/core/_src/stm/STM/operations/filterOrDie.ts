/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrDie
 * @tsplus pipeable effect/core/stm/STM filterOrDie
 */
export function filterOrDie<A, B extends A>(
  f: Refinement<A, B>,
  defect: LazyArg<unknown>
): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>
): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>
) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrElse(f, STM.die(defect))
}
