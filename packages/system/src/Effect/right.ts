// ets_tracing: off

import * as E from "../Either/index.js"
import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns a successful effect if the value is `Right`, or fails with the error `None`.
 */
export function right<R, E, B, C>(
  self: Effect<R, E, E.Either<B, C>>,
  __trace?: string
): Effect<R, O.Option<E>, C> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    E.fold(() => fail(O.none), succeed),
    __trace
  )
}
