// ets_tracing: off

import * as Ex from "../../../../Exit/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as Collect from "./collect.js"

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, A, L1>(
  self: C.Stream<R, E, Ex.Exit<L1, A>>
): C.Stream<R, E, A> {
  return Collect.collect_(
    self,
    Ex.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
