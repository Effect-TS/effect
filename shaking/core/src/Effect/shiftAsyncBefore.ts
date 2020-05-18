import { Effect, AsyncRE } from "../Support/Common/effect"

import { applySecond } from "./applySecond"
import { shiftedAsync } from "./shiftedAsync"

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shiftedAsync, io)
}
