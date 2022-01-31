// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapConcatChunkM_ } from "./mapConcatChunkM.js"

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM_<R, R2, E, E2, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => T.Effect<R2, E2, Iterable<O2>>
): Stream<R & R2, E2 | E, O2> {
  return mapConcatChunkM_(self, (o) => pipe(T.map_(f(o), A.from)))
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM<R2, E2, O, O2>(f: (_: O) => T.Effect<R2, E2, Iterable<O2>>) {
  return <R, E>(self: Stream<R, E, O>) => mapConcatM_(self, f)
}
