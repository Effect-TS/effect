import * as O from "../../Option"

import { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"
import { succeedNow } from "./succeedNow"

/**
 * Converts an option on errors into an option on values.
 */
export const optional = <S, R, E, A>(
  self: Effect<S, R, O.Option<E>, A>
): Effect<S, R, E, O.Option<A>> =>
  foldM_(
    self,
    O.fold(() => succeedNow(O.none), fail),
    (a) => succeedNow(O.some(a))
  )
