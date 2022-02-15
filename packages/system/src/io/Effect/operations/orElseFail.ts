import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @tsplus fluent ets/Effect orElseFail
 */
export function orElseFail_<R, E, A, E2>(
  self: Effect<R, E, A>,
  e: LazyArg<E2>,
  __etsTrace?: string
): Effect<R, E2, A> {
  return self.orElse(Effect.fail(e))
}

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: LazyArg<E2>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E2, A> => self.orElseFail(e)
}
