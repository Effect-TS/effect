import { pipe } from "../Function"
import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM } from "./foldM"

/**
 * Converts an option on values into an option on errors.
 */
export function some<S, R, E, A>(
  self: Effect<S, R, E, O.Option<A>>
): Effect<S, R, O.Option<E>, A> {
  return pipe(
    self,
    foldM(
      (e) => fail(O.some(e)),
      O.fold(() => fail(O.none), succeed)
    )
  )
}
