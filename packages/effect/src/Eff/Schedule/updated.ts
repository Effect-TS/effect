import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the update function transformed by the
 * specified update transformer.
 */
export const updated = <S, R, ST, A, A1 extends A, S2, R2>(
  f: (
    update: (a: A, s: ST) => Effect<S, R, void, any>
  ) => (a: A1, s: ST) => Effect<S2, R2, void, any>
) => <B>(self: Schedule<S, R, ST, A, B>) =>
  new Schedule<S | S2, R & R2, ST, A1, B>(self.initial, f(self.update), self.extract)
