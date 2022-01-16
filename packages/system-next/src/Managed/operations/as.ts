// ets_tracing: off

import type { Managed } from "../definition"
import { map_ } from "./map"

/**
 * Maps this `Managed` to the specified constant while preserving the effects of
 * this `Managed`.
 */
export function as_<R, E, A, B>(
  self: Managed<R, E, A>,
  value: B,
  __trace?: string
): Managed<R, E, B> {
  return map_(self, () => value, __trace)
}

/**
 * Maps this `Managed` to the specified constant while preserving the effects of
 * this `Managed`.
 *
 * @ets_data_first as_
 */
export function as<B>(value: B, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, B> =>
    as_(self, value, __trace)
}
