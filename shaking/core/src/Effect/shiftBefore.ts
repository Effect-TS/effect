import { Effect, AsyncRE } from "../Support/Common/effect"

import { applySecond } from "./applySecond"
import { shifted } from "./shifted"

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shifted, io)
}
