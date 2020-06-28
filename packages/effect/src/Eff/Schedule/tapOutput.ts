import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { map_ } from "../Effect/map_"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Sends every input value to the specified sink.
 */
export const tapOutput_ = <S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => Effect<S1, R1, never, any>
): Schedule<S | S1, R & R1, ST, A, B> =>
  updated_(self, (update) => (a, s) =>
    chain_(update(a, s), (s1) => map_(f(self.extract(a, s1)), () => s1))
  )

/**
 * Sends every input value to the specified sink.
 */
export const tapOutput = <B, S1, R1>(f: (a: B) => Effect<S1, R1, never, any>) => <
  S,
  R,
  ST,
  A
>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S | S1, R & R1, ST, A, B> => tapOutput_(self, f)
