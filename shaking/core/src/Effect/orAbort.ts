import { abort, withRemaining } from "../Exit"
import { Effect } from "../Support/Common/effect"

import { chainError_ } from "./chainError"
import { completed } from "./completed"

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, never, A> {
  return chainError_(io, (e, rem) =>
    completed(withRemaining(abort(e), ...(rem._tag === "Some" ? rem.value : [])))
  )
}
