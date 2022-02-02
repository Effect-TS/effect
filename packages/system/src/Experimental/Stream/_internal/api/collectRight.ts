// ets_tracing: off

import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as Collect from "./collect"

/**
 * Filters any `Left` values.
 */
export function collectRight<R, E, A, R1>(
  self: C.Stream<R, E, E.Either<A, R1>>
): C.Stream<R, E, R1> {
  return Collect.collect_(
    self,
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
