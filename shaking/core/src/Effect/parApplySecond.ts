import { Effect, AsyncRE } from "../Support/Common/effect"
import { snd } from "../Support/Utils"

import { parZipWith } from "./parZipWith"

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export function parApplySecond<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(ioa, iob, snd)
}
