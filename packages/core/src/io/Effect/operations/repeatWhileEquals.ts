import type { LazyArg } from "../../../data/Function"
import type { Equal } from "../../../prelude/Equal"
import { Effect } from "../definition"

/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhileEquals
 */
export function repeatWhileEquals_<R, E, A>(self: Effect<R, E, A>, equal: Equal<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(a).flatMap((a) => self.repeatWhile((_) => equal.equals(_, a)))
}

/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @ets_data_first repeatWhileEquals_
 */
export function repeatWhileEquals<A>(equal: Equal<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string) =>
    <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
      self.repeatWhileEquals(equal)(a)
}
