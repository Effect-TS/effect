import { id } from "./id"
import { Schedule } from "./schedule"
import { split_ } from "./split"

/**
 * Puts this schedule into the first element of a tuple, and passes along
 * another value unchanged as the second element of the tuple.
 */
export const first = <S, R, A, B, C>(self: Schedule<S, R, A, B>) =>
  split_(self, id<C>())
