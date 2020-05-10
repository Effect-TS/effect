import { Effect, AsyncRE } from "../Support/Common/effect"

import { after } from "./after"
import { applySecond } from "./applySecond"

/**
 * Delay evaluation of inner by some amount of time
 * @param inner
 * @param ms
 */
export function delay<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R, E, A> {
  return applySecond(after(ms), inner)
}
