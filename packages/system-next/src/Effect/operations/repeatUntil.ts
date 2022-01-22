import type { Predicate } from "../../Function"
import type { Effect } from "../definition"
import { repeatUntilEffect_ } from "./repeatUntilEffect"
import { succeed } from "./succeed"

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @ets_data_first repeatUntil_
 */
export function repeatUntil<A>(p: Predicate<A>, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    repeatUntil_(self, p, __trace)
}

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @ets fluent ets/Effect repeatUntil
 */
export function repeatUntil_<R, E, A>(
  self: Effect<R, E, A>,
  p: Predicate<A>,
  __trace?: string
): Effect<R, E, A> {
  return repeatUntilEffect_(self, (a) => succeed(() => p(a)), __trace)
}
