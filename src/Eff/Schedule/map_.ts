import { Schedule } from "./schedule"

/**
 * Returns a new schedule that maps over the output of this one.
 */
export const map_ = <S, R, ST, A, B, C>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B) => C
) => new Schedule(self.initial, self.update, (a: A, s) => f(self.extract(a, s)))
