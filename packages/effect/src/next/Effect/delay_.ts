import { HasClock } from "../Clock"

import { chain_ } from "./chain_"
import { AsyncRE, Effect } from "./effect"
import { sleep } from "./sleep"

/**
 * Delay the effect of ms milliseconds
 */
export const delay_ = <S, R, E, A>(
  effect: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R & HasClock, E, A> => chain_(sleep(ms), () => effect)
