import { sleep, Clock } from "../Clock"
import { as_ } from "../Effect/as"
import { chain_ } from "../Effect/chain_"
import { succeedNow } from "../Effect/succeedNow"
import { nextIntBetween, Random } from "../Random"

import { Schedule } from "./schedule"

/**
 * A schedule that sleeps for random duration that is uniformly distributed in the given range.
 * The schedules output is the duration it has slept on the last update, or 0 if it hasn't updated yet.
 */
export const randomDelay = (
  min: number,
  max: number
): Schedule<unknown, Random & Clock, number, unknown, number> =>
  new Schedule(
    succeedNow(0),
    () => chain_(nextIntBetween(min, max), (s) => as_(sleep(s), s)),
    (_, s) => s
  )
