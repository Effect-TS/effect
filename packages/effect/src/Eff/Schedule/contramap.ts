import { Schedule } from "./schedule"

/**
 * Returns a new schedule that deals with a narrower class of inputs than
 * this schedule.
 */
export const contramap_ = <S, R, ST, A, B, A1>(
  self: Schedule<S, R, ST, A, B>,
  f: (_: A1) => A
): Schedule<S, R, ST, A1, B> =>
  new Schedule(
    self.initial,
    (a, s) => self.update(f(a), s),
    (a, s) => self.extract(f(a), s)
  )

/**
 * Returns a new schedule that deals with a narrower class of inputs than
 * this schedule.
 */
export const contramap = <A, A1>(f: (_: A1) => A) => <S, R, ST, B>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R, ST, A1, B> =>
  new Schedule(
    self.initial,
    (a, s) => self.update(f(a), s),
    (a, s) => self.extract(f(a), s)
  )
