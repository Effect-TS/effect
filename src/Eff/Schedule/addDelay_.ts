import { succeedNow } from "../Effect/succeedNow"

import { addDelayM_ } from "./addDelayM_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the given delay added to every update.
 */
export const addDelay_ = <S, R, A, B>(
  self: Schedule<S, R, A, B>,
  f: (b: B) => number
) => addDelayM_(self, (b) => succeedNow(f(b)))
