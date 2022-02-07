// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as LoopOnPartialChunksElements from "./loopOnPartialChunksElements.js"

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterEffect_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): C.Stream<R & R1, E | E1, A> {
  return LoopOnPartialChunksElements.loopOnPartialChunksElements_(self, (a, emit) =>
    T.chain_(f(a), (r) => (r ? emit(a) : T.unit))
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @ets_data_first filterEffect_
 */
export function filterEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: C.Stream<R, E, A>) => filterEffect_(self, f)
}
