import { Exit } from "../Exit"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { interruptLoser } from "./interruptLoser"
import { Fiber } from "./makeFiber"
import { raceFold } from "./raceFold"

/**
 * Return the result of the first IO to complete successfully.
 *
 * If an error occurs, fall back to the other IO.
 * If both error, then fail with the second errors
 * @param io1
 * @param io2
 */
export function race<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser)
}
function fallbackToLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return exit._tag === "Done" ? interruptLoser(exit, loser) : loser.join
}
