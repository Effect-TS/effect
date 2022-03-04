import type { LazyArg, Predicate } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrDieMessage
 */
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
 * @ets_data_first filterOrDieMessage_
 */
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>
): <R, E>(self: STM<R, E, A>) => STM<R, E, A> {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrDieMessage(f, message)
}
