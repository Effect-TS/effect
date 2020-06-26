import { chain_ } from "../Effect/chain_"
import { delay } from "../Effect/delay"
import { Effect } from "../Effect/effect"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export const addDelayM = <B, S1, R1>(f: (b: B) => Effect<S1, R1, never, number>) => <
  S,
  R,
  A
>(
  self: Schedule<S, R, A, B>
) =>
  updated_(self, (update) => (a, s) =>
    chain_(f(self.extract(a, s)), (d) =>
      chain_(update(a, s), (r) => delay(d)(succeedNow(r)))
    )
  )
