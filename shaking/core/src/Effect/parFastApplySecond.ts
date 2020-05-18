import { Effect, AsyncRE } from "../Support/Common/effect"
import { snd } from "../Support/Utils"

import { parFastZipWith } from "./parFastZipWith"

/**
 * Exeute two IOs in parallel and take the result of the second
 * Interrupt at first error
 * @param ioa
 * @param iob
 */
export function parFastApplySecond<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(ioa, iob, snd)
}
