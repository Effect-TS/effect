// ets_tracing: off

import type { Managed } from "../definition"
import { succeedNow } from "./succeedNow"
import { tapBoth_ } from "./tapBoth"

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 */
export function tapError_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>,
  __trace?: string
): Managed<R & R1, E | E1, A> {
  return tapBoth_(self, f, succeedNow, __trace)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R1, E1, X>(
  f: (e: E) => Managed<R1, E1, X>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => tapError_(self, f, __trace)
}
