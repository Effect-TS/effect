import { Effect } from "../Support/Common/effect"

import { interruptibleRegion } from "./interruptibleRegion"

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return interruptibleRegion(io, true)
}
