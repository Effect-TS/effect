// ets_tracing: off

import { chainPar } from "./chainPar.js"
import type { Stream } from "./definitions.js"

/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 */
export function flattenPar_<R, R1, E, E1, O1>(
  self: Stream<R, E, Stream<R1, E1, O1>>,
  n: number,
  outputBuffer = 16
): Stream<R & R1, E | E1, O1> {
  return chainPar(n, outputBuffer)((x: Stream<R1, E1, O1>) => x)(self)
}

/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 */
export function flattenPar(n: number, outputBuffer = 16) {
  return <R, R1, E, E1, O1>(self: Stream<R, E, Stream<R1, E1, O1>>) =>
    flattenPar_(self, n, outputBuffer)
}
