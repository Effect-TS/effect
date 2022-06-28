/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrDieMessage
 * @tsplus pipeable effect/core/stm/STM filterOrDieMessage
 */
export function filterOrDieMessage<A, B extends A>(
  f: Refinement<A, B>,
  message: LazyArg<string>
): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>
): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>
) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrElse(f, STM.dieMessage(message))
}
