// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use rechunk afterwards.
 */
export function mapEffectPar<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, A1>,
  n: number
): C.Stream<R & R1, E | E1, A1> {
  return new C.Stream(
    pipe(
      self.channel,
      CH.concatMap(CH.writeChunk),
      CH.mapOutEffectPar(n, f),
      CH.mapOut(CK.single)
    )
  )
}
