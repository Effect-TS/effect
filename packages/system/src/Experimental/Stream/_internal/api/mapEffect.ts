// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as LoopOnPartialChunksElements from "./loopOnPartialChunksElements.js"

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapEffect_<R, E, A, R1, E1, B>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, B>
): C.Stream<R & R1, E | E1, B> {
  return LoopOnPartialChunksElements.loopOnPartialChunksElements_<R, E, A, R1, E1, B>(
    self,
    (a, emit) => T.chain_(f(a), emit)
  )
}

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R1, E1, B>(
  f: (a: A) => T.Effect<R1, E1, B>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R & R1, E | E1, B> {
  return (self) => mapEffect_(self, f)
}
