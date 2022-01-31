// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../../Effect/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksEffect_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (c: CK.Chunk<A>) => T.Effect<R1, E1, CK.Chunk<A1>>
): C.Stream<R & R1, E | E1, A1> {
  return new C.Stream(CH.mapOutEffect_(self.channel, f))
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @ets_data_first mapChunksEffect_
 */
export function mapChunksEffect<R1, E1, A, A1>(
  f: (c: CK.Chunk<A>) => T.Effect<R1, E1, CK.Chunk<A1>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => mapChunksEffect_(self, f)
}
