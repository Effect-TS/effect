import { Effect, AsyncRE } from "../Support/Common/effect"
import { tuple2 } from "../Support/Utils"

import { parZipWith } from "./parZipWith"

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export function parZip<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2)
}
