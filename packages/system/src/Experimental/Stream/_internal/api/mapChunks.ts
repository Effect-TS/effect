// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  f: (chunk: CK.Chunk<A>) => CK.Chunk<A1>
): C.Stream<R, E, A1> {
  return new C.Stream(CH.mapOut_(self.channel, f))
}

/**
 * Transforms the chunks emitted by this stream.
 *
 * @ets_data_first mapChunks_
 */
export function mapChunks<A, A1>(f: (chunk: CK.Chunk<A>) => CK.Chunk<A1>) {
  return <R, E>(self: C.Stream<R, E, A>) => mapChunks_(self, f)
}
