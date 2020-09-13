import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 */
export function flip<S, R, E, A>(self: Effect<S, R, E, A>) {
  return foldM_(self, succeed, fail)
}
