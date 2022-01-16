// ets_tracing: off

import type { Managed } from "../definition"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E2, A | A2> {
  return foldManaged_(self, f, succeedNow, __trace)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Managed<R2, E2, A2>,
  __trace?: string
) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A | A2> =>
    catchAll_(self, f, __trace)
}
