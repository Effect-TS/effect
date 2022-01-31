// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as LoopOnPartialChunks from "./loopOnPartialChunks.js"

/**
 * Loops on chunks elements emitting partially
 */
export function loopOnPartialChunksElements_<R, E, A, R1, E1, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A, emit: (a: A1) => T.UIO<void>) => T.Effect<R1, E1, void>
): C.Stream<R & R1, E | E1, A1> {
  return LoopOnPartialChunks.loopOnPartialChunks_(self, (a, emit) =>
    T.as_(
      T.forEachUnit_(a, (a) => f(a, emit)),
      true
    )
  )
}

/**
 * Loops on chunks elements emitting partially
 *
 * @ets_data_first loopOnPartialChunksElements_
 */
export function loopOnPartialChunksElements<A, R1, E1, A1>(
  f: (a: A, emit: (a: A1) => T.UIO<void>) => T.Effect<R1, E1, void>
) {
  return <R, E>(self: C.Stream<R, E, A>) => loopOnPartialChunksElements_(self, f)
}
