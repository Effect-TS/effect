import { HasClock } from "../Clock"

import { delay_ } from "./delay_"
import { AsyncRE, Effect } from "./effect"

/**
 * Delay the effect of n milliseconds
 */
export const delay = (ms: number) => <S, R, E, A>(
  effect: Effect<S, R, E, A>
): AsyncRE<R & HasClock, E, A> => delay_(effect, ms)
