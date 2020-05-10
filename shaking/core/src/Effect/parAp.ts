import { FunctionN } from "fp-ts/lib/function"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parZipWith } from "./parZipWith"

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(ioa, iof, (a, f) => f(a))
}
