import type { Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntil
 */
export function repeatUntil_<R, E, A>(
  self: Effect<R, E, A>,
  p: Predicate<A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.repeatUntilEffect((a) => Effect.succeed(() => p(a)))
}

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @ets_data_first repeatUntil_
 */
export function repeatUntil<A>(p: Predicate<A>, __etsTrace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => repeatUntil_(self, p)
}
