import { succeed } from "./core"
import type { Effect } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(self: Effect<R, E, A>): Effect<R, never, E | A> {
  return foldM_(self, succeed, succeed)
}
