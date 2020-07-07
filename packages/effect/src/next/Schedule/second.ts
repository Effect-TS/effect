import { id } from "./id"
import { Schedule } from "./schedule"
import { split_ } from "./split"

/**
 * Puts this schedule into the second element of a tuple, and passes along
 * another value unchanged as the first element of the tuple.
 */
export const second = <S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) =>
  split_(id<C>(), self)
