import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import * as FM from "./foldM"

/**
 * Converts an option on errors into an option on values.
 */
export function unoption<R, E, A>(self: Effect<R, O.Option<E>, A>) {
  return FM.foldM_(
    self,
    O.fold(
      () => succeed<O.Option<A>>(O.none),
      (_) => fail(_)
    ),
    (a) => succeed(O.some(a))
  )
}
