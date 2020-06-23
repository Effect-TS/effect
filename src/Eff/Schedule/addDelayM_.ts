import { chain_ } from "../Effect/chain_"
import { delay } from "../Effect/delay"
import { Effect } from "../Effect/effect"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export const addDelayM_ = <S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B) => Effect<S1, R1, never, number>
) =>
  updated_(self, (update) => (a, s) =>
    chain_(f(self.extract(a, s)), (d) =>
      chain_(update(a, s), (r) => delay(d)(succeedNow(r)))
    )
  )
