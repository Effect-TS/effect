import { Exit, done } from "../Exit"
import { Effect } from "../Support/Common/effect"

import { foldExit_ } from "./foldExit"
import { pure } from "./pure"

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, never, Exit<E, A>> {
  return foldExit_(io, pure, (d) => pure(done(d)))
}
