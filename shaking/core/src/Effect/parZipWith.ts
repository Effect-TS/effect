import type { FunctionN } from "../Function"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { completed } from "./completed"
import { raceFold } from "./raceFold"
import { zipWith_ } from "./zipWith"

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<S, S2, R, R2, E, E2, A, B, C>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith_(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith_(aFiber.join, completed(bExit), f)
  )
}
