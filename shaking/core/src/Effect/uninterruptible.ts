import { Effect } from "../Support/Common/effect"

import { interruptibleRegion } from "./interruptibleRegion"

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return interruptibleRegion(io, false)
}
