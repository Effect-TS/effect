// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `bufferSize` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function chainPar_<R, R1, E, E1, A, B>(
  self: C.Stream<R, E, A>,
  n: number,
  f: (a: A) => C.Stream<R1, E1, B>,
  bufferSize = 16
): C.Stream<R & R1, E | E1, B> {
  return new C.Stream(
    CH.mergeMap_(
      CH.concatMap_(self.channel, (_) => CH.writeChunk(_)),
      n,
      (_) => f(_).channel,
      bufferSize
    )
  )
}

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `bufferSize` elements of the produced streams may be
 * buffered in memory by this operator.
 *
 * @ets_data_first chainPar_
 */
export function chainPar<R1, E1, A, B>(
  n: number,
  f: (a: A) => C.Stream<R1, E1, B>,
  bufferSize = 16
) {
  return <R, E>(self: C.Stream<R, E, A>) => chainPar_(self, n, f, bufferSize)
}
