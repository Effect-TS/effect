import { fold } from "./fold"
import { Schedule } from "./schedule"

/**
 * Emit the number of repetitions of the schedule so far.
 */
export const repetitions = <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
  fold(0)((n, _: B) => n + 1)
