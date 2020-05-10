import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, never> {
  return chain_(io, () => forever(io))
}
