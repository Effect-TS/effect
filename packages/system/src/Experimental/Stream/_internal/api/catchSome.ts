// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CatchAll from "./catchAll.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  pf: (e: E) => O.Option<C.Stream<R1, E1, A1>>
): C.Stream<R & R1, E1, A | A1> {
  return CatchAll.catchAll_(self, (e) =>
    O.fold_(
      pf(e),
      () => fail(e),
      (_) => _
    )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<R1, E, E1, A1>(pf: (e: E) => O.Option<C.Stream<R1, E1, A1>>) {
  return <R, A>(self: C.Stream<R, E, A>) => catchSome_(self, pf)
}
