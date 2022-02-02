// ets_tracing: off

import { identity } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as ChainPar from "./chainPar.js"

/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 */
export function flattenPar_<R, R1, E, E1, A>(
  self: C.Stream<R, E, C.Stream<R1, E1, A>>,
  n: number,
  outputBuffer = 16
): C.Stream<R & R1, E | E1, A> {
  return ChainPar.chainPar_(self, n, identity, outputBuffer)
}

/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 *
 * @ets_data_first flattenPar_
 */
export function flattenPar(n: number, outputBuffer = 16) {
  return <R, R1, E, E1, A>(self: C.Stream<R, E, C.Stream<R1, E1, A>>) =>
    flattenPar_(self, n, outputBuffer)
}
