import { choose_ } from "./choose"
import { id } from "./id"
import { Schedule } from "./schedule"

/**
 * Puts this schedule into the first element of a either, and passes along
 * another value unchanged as the second element of the either.
 */
export const left = <S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) =>
  choose_(self, id<C>())
