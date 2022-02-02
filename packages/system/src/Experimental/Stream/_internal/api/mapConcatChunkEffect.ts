// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as T from "../../../../Effect"
import { identity } from "../../../../Function"
import type * as C from "../core"
import * as MapConcatChunk from "./mapConcatChunk"
import * as MapEffect from "./mapEffect"

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkEffect_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, CK.Chunk<A1>>
): C.Stream<R & R1, E | E1, A1> {
  return MapConcatChunk.mapConcatChunk_(MapEffect.mapEffect_(self, f), identity)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 *
 * @ets_data_first mapConcatChunkEffect_
 */
export function mapConcatChunkEffect<R1, E1, A, A1>(
  f: (a: A) => T.Effect<R1, E1, CK.Chunk<A1>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => mapConcatChunkEffect_(self, f)
}
