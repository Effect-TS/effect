import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the update function transformed by the
 * specified update transformer.
 */
export const updated_ = <S, R, ST, A, B, S2, R2, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (
    update: (a: A, s: ST) => Effect<S, R, void, ST>
  ) => (a: A1, s: ST) => Effect<S2, R2, void, ST>
): Schedule<S | S2, R & R2, ST, A1, B> =>
  new Schedule<S | S2, R & R2, any, A1, B>(self.initial, f(self.update), self.extract)
