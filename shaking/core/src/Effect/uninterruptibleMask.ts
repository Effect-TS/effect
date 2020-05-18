import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { InterruptMaskCutout, makeInterruptMaskCutout } from "./InterruptMaskCutout"
import { accessInterruptible } from "./accessInterruptible"
import { chain_ } from "./chain"
import { uninterruptible } from "./uninterruptible"

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<S, R, E, A>(
  f: FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<S, R, E, A>(flag)
    return uninterruptible(f(cutout))
  })
}
