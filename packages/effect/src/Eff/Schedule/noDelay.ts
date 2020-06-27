import { Clock, ClockURI } from "../Clock"
import { unit } from "../Effect/unit"

import { provideSome_ } from "./provideSome_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that will not perform any sleep calls between recurrences.
 */
export const noDelay = <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
  provideSome_(self, (r: R & Clock): R & Clock => ({
    ...r,
    [ClockURI]: {
      ...r[ClockURI],
      sleep: () => unit
    }
  }))
