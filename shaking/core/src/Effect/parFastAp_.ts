import type { FunctionN } from "../Function"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastZipWith } from "./parFastZipWith"

/**
 * Parallel form of ap_ using parFastZipWith
 * @param iof
 * @param ioa
 */
export function parFastAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(iof, ioa, (f, a) => f(a))
}
