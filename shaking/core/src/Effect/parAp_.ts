import { FunctionN } from "fp-ts/lib/function"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parZipWith } from "./parZipWith"

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a))
}
