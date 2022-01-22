import type { Effect } from "../definition"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from all errors.
 *
 * @ets fluent ets/Effect catchAll
 */
export function catchAll_<R2, E2, A2, R, E, A>(
  self: Effect<R2, E2, A2>,
  f: (e: E2) => Effect<R, E, A>,
  __trace?: string
) {
  return foldEffect_(self, f, succeedNow, __trace)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<R, E, E2, A>(f: (e: E2) => Effect<R, E, A>, __trace?: string) {
  return <R2, A2>(self: Effect<R2, E2, A2>) => catchAll_(self, f, __trace)
}
