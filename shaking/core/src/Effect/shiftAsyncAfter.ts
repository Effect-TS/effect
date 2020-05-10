import { Effect, AsyncRE } from "../Support/Common/effect"

import { applyFirst } from "./applyFirst"
import { shiftedAsync } from "./shiftedAsync"

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shiftedAsync)
}
