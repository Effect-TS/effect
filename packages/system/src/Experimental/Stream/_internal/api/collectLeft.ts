// ets_tracing: off

import * as E from "../../../../Either/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as Collect from "./collect.js"

/**
 * Filters any `Right` values.
 */
export function collectLeft<R, E, L1, A>(
  self: C.Stream<R, E, E.Either<L1, A>>
): C.Stream<R, E, L1> {
  return Collect.collect_(
    self,
    E.fold(
      (a) => O.some(a),
      (_) => O.none
    )
  )
}
