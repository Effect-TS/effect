import type { HasClock } from "../Clock"
import { delay_ } from "./delay_"
import type { Effect } from "./effect"

/**
 * Delay the effect of n milliseconds
 */
export function delay(ms: number) {
  return <S, R, E, A>(effect: Effect<R, E, A>): Effect<R & HasClock, E, A> =>
    delay_(effect, ms)
}
