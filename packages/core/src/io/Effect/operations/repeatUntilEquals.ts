import type { LazyArg } from "../../../data/Function"
import type { Equal } from "../../../prelude/Equal"
import { Effect } from "../definition"

/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntilEquals
 */
export function repeatUntilEquals_<R, E, A>(self: Effect<R, E, A>, equal: Equal<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(a).flatMap((a) => self.repeatUntil((_) => equal.equals(_, a)))
}

/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @ets_data_first repeatUntilEquals_
 */
export function repeatUntilEquals<A>(equal: Equal<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string) =>
    <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
      self.repeatUntilEquals(equal)(a)
}
