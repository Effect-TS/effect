import type { Lazy } from "../Function"
import { ISuspended } from "../Support/Common"
import type { Effect } from "../Support/Common/effect"

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */

export function suspended<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return new ISuspended(thunk) as any
}
