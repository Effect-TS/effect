// ets_tracing: off

import type { Managed } from "../definition"
import { map_ } from "./map"
import { mapError_ } from "./mapError"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function mapBoth_<R, E, A, E2, B>(
  self: Managed<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B,
  __trace?: string
): Managed<R, E2, B> {
  return map_(mapError_(self, f), g, __trace)
}

export function mapBoth<E, E2, A, B>(
  f: (e: E) => E2,
  g: (a: A) => B,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R, E2, B> => mapBoth_(self, f, g, __trace)
}
