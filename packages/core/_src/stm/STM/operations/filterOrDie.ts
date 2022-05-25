/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrDie
 */
export function filterOrDie_<R, E, A, B extends A>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  defect: LazyArg<unknown>
): STM<R, E, B>
export function filterOrDie_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>
): STM<R, E, A>
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
 * @tsplus static ets/STM/Aspects filterOrDie
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
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrDie(f, defect)
}
