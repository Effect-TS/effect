import { Effect, AsyncRE } from "../Support/Common/effect"
import { fst } from "../Support/Utils"

import { parZipWith } from "./parZipWith"

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export function parApplyFirst<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, A> {
  return parZipWith(ioa, iob, fst)
}
