import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"

/**
 * Converts an option on errors into an option on values.
 */
export const optional = <S, R, E, A>(
  self: Effect<S, R, O.Option<E>, A>
): Effect<S, R, E, O.Option<A>> =>
  foldM_(
    self,
    O.fold(() => succeed(O.none), fail),
    (a) => succeed(O.some(a))
  )
