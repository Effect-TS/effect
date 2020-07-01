import { HasClock, ProxyClock } from "../Clock"
import { unit } from "../Effect/unit"
import { replaceServiceIn_ } from "../Has"

import { provideSome_ } from "./provideSome_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that will not perform any sleep calls between recurrences.
 */
export const noDelay = <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
  provideSome_(self, (r: R & HasClock): R & HasClock =>
    replaceServiceIn_(r, HasClock, (c) => new ProxyClock(c.currentTime, () => unit))
  )
