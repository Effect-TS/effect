import type { LazyArg } from "../../../data/Function"
import type { Equal } from "../../../prelude/Equal"
import { Effect } from "../definition"

/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus fluent ets/Effect retryUntilEquals
 */
export function retryUntilEquals_<R, E, A>(self: Effect<R, E, A>, equal: Equal<E>) {
  return (e: LazyArg<E>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(e).flatMap((_) => self.retryUntil((e) => equal.equals(_, e)))
}

/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @ets_data_first retryUntil_
 */
export function retryUntilEquals<E>(equal: Equal<E>) {
  return (e: LazyArg<E>, __tsplusTrace?: string) =>
    <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
      self.retryUntilEquals(equal)(e)
}
