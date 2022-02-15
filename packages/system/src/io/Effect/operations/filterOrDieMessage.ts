import type { LazyArg, Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Dies with a `RuntimeException` having the specified text message if the
 * predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrDieMessage
 */
export function filterOrDieMessage_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  message: LazyArg<string>,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.filterOrElse(f, Effect.dieMessage(message))
}

/**
 * Dies with specified defect if the predicate fails.
 *
 * @ets_data_first filterOrDieMessage_
 */
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.filterOrDieMessage(f, message)
}
