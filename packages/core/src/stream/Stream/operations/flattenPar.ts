import { identity } from "../../../data/Function"
import type { Stream } from "../definition"

/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 *
 * @tsplus fluent ets/Stream flattenPar
 */
export function flattenPar<R, E, A, R1, E1>(
  self: Stream<R, E, Stream<R1, E1, A>>,
  n: number,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return self.flatMapPar(n, identity, outputBuffer)
}
