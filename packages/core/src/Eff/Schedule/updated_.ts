import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the update function transformed by the
 * specified update transformer.
 */
export const updated_ = <S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (
    update: (a: A, s: ST) => Effect<S, R, void, any>
  ) => (a: A, s: ST) => Effect<S2, R2, void, any>
): Schedule<S | S2, R & R2, ST, A, B> =>
  new Schedule<S | S2, R & R2, any, A, B>(self.initial, f(self.update), self.extract)
