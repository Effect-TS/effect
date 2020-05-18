import { Effect } from "../Support/Common/effect"

import { as } from "./as"

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, void> {
  return as(io, undefined)
}
