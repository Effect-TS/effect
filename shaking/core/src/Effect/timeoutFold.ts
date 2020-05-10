import type { Exit } from "../Exit"
import type { FunctionN } from "../Function"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { after } from "./after"
import { applySecond } from "./applySecond"
import { Fiber } from "./makeFiber"
import { raceFold } from "./raceFold"

/**
 * Execute an IO and produce the next IO to run based on whether it completed successfully in the alotted time or not
 * @param source
 * @param ms
 * @param onTimeout
 * @param onCompleted
 */
export function timeoutFold<S, S1, S2, R, R2, R3, E1, E2, A, B, C>(
  source: Effect<S, R, E1, A>,
  ms: number,
  onTimeout: FunctionN<[Fiber<E1, A>], Effect<S1, R2, E2, B>>,
  onCompleted: FunctionN<[Exit<E1, A>], Effect<S2, R3, E2, C>>
): AsyncRE<R & R2 & R3, E2, B | C> {
  return raceFold(
    source,
    after(ms),
    /* istanbul ignore next */
    (exit, delayFiber) => applySecond(delayFiber.interrupt, onCompleted(exit)),
    (_, fiber) => onTimeout(fiber)
  )
}
