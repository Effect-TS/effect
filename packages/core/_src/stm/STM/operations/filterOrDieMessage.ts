/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrDieMessage
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  message: LazyArg<string>
): STM<R, E, B>
export function filterOrDieMessage_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  message: LazyArg<string>
): STM<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  message: LazyArg<string>
): STM<R, E, A> {
  return self.filterOrElse(f, STM.dieMessage(message))
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrDieMessage
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
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrDieMessage(f, message)
}
