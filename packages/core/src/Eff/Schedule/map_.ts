import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns a new schedule that maps over the output of this one.
 */
export const map_ = <S, R, A, B, C>(
  self: Schedule<S, R, A, B>,
  f: (b: B) => C
): Schedule<S, R, A, C> =>
  new ScheduleClass(self.initial, self.update, (a: A, s) => f(self.extract(a, s)))
