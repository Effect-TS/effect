import { choose_ } from "./choose"
import { id } from "./id"
import { Schedule } from "./schedule"

/**
 * Puts this schedule into the second element of a either, and passes along
 * another value unchanged as the first element of the either.
 */
export const right = <S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) =>
  choose_(id<C>(), self)
