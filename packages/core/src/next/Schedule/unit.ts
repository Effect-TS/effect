import { as } from "./as"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that maps this schedule to a void output.
 */
export const unit = <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R, ST, A, void> => as(undefined)(self)
