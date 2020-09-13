import type { HasClock } from "../Clock"
import { delay_ } from "./delay_"
import type { AsyncRE, Effect } from "./effect"

/**
 * Delay the effect of n milliseconds
 */
export function delay(ms: number) {
  return <S, R, E, A>(effect: Effect<S, R, E, A>): AsyncRE<R & HasClock, E, A> =>
    delay_(effect, ms)
}
