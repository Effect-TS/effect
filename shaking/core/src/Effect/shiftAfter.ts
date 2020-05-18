import { Effect, AsyncRE } from "../Support/Common/effect"

import { applyFirst } from "./applyFirst"
import { shifted } from "./shifted"

/**
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shifted)
}
