import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { InterruptMaskCutout, makeInterruptMaskCutout } from "./InterruptMaskCutout"
import { accessInterruptible } from "./accessInterruptible"
import { chain_ } from "./chain"
import { interruptible } from "./interruptible"

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export function interruptibleMask<S, R, E, A>(
  f: FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessInterruptible, (flag) =>
    interruptible(f(makeInterruptMaskCutout(flag)))
  )
}
