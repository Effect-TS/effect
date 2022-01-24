import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { map_ } from "./map"

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2, X, Y>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>,
  __trace?: string
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldManaged_(
    self,
    (e) => chain_(f(e), () => failNow(e)),
    (a) => map_(g(a), () => a),
    __trace
  )
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @ets_data_first tapBoth_
 */
export function tapBoth<E, A, R1, E1, R2, E2, X, Y>(
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>) => tapBoth_(self, f, g, __trace)
}
