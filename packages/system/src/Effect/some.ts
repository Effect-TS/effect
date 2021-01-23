import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(
  self: Effect<R, E, O.Option<A>>
): Effect<R, O.Option<E>, A> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    O.fold(() => fail(O.none), succeed)
  )
}
