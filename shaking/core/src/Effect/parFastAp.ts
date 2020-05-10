import { FunctionN } from "fp-ts/lib/function"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastZipWith } from "./parFastZipWith"

/**
 * Parallel form of ap
 * Interrupt at first error
 * @param ioa
 * @param iof
 */
export function parFastAp<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(ioa, iof, (a, f) => f(a))
}
