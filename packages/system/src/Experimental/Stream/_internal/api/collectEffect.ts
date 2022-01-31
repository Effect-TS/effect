// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as LoopOnPartialChunksElements from "./loopOnPartialChunksElements.js"

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectEffect_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
): C.Stream<R & R1, E | E1, A1> {
  return LoopOnPartialChunksElements.loopOnPartialChunksElements_(self, (a, emit) =>
    O.fold_(
      pf(a),
      () => T.unit,
      (_) => T.asUnit(T.chain_(_, emit))
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 *
 * @ets_data_first collectEffect_
 */
export function collectEffect<R1, E1, A, A1>(
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => collectEffect_(self, pf)
}
