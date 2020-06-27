import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the specified initial state transformed
 * by the specified initial transformer.
 */
export const initialized_ = <S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (s: Effect<S, R, never, ST>) => Effect<S2, R2, never, ST>
) => new Schedule<S | S2, R & R2, ST, A, B>(f(self.initial), self.update, self.extract)

/**
 * Returns a new schedule with the specified initial state transformed
 * by the specified initial transformer.
 */
export const initialized = <S, R, ST, S2, R2>(
  f: (s: Effect<S, R, never, ST>) => Effect<S2, R2, never, ST>
) => <A, B>(self: Schedule<S, R, ST, A, B>) =>
  new Schedule<S | S2, R & R2, ST, A, B>(f(self.initial), self.update, self.extract)
