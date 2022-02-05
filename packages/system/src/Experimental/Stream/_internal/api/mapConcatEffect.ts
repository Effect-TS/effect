// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { identity } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as MapConcatChunk from "./mapConcatChunk.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatEffect_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Iterable<A1>>
): C.Stream<R & R1, E | E1, A1> {
  return MapConcatChunk.mapConcatChunk_(
    MapEffect.mapEffect_(self, (a) => T.map_(f(a), CK.from)),
    identity
  )
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 *
 * @ets_data_first mapConcatEffect_
 */
export function mapConcatEffect<R1, E1, A, A1>(
  f: (a: A) => T.Effect<R1, E1, Iterable<A1>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => mapConcatEffect_(self, f)
}
