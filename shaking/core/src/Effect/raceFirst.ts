import { Effect, AsyncRE } from "../Support/Common/effect"

import { interruptLoser } from "./interruptLoser"
import { raceFold } from "./raceFold"

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export function raceFirst<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser)
}
