import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM"

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Effect<R, O.Option<E>, A>
): Effect<R, E, O.Option<A>> {
  return foldM_(
    self,
    O.fold(() => succeed(O.none), fail),
    (a) => succeed(O.some(a))
  )
}
