import type { HasClock } from "../Clock"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { sleep } from "./sleep"

/**
 * Delay the effect of ms milliseconds
 */
export function delay_<R, E, A>(
  effect: Effect<R, E, A>,
  ms: number
): Effect<R & HasClock, E, A> {
  return chain_(sleep(ms), () => effect)
}
