import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapConcatChunkM_ } from "./mapConcatChunkM"

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM_<R, R2, E, E2, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => T.Effect<R2, E2, Iterable<O2>>
): Stream<R & R2, E2 | E, O2> {
  return mapConcatChunkM_(self, (o) => pipe(T.map_(f(o), (o) => Array.from(o))))
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM<R2, E2, O, O2>(f: (_: O) => T.Effect<R2, E2, Iterable<O2>>) {
  return <R, E>(self: Stream<R, E, O>) => mapConcatM_(self, f)
}
