import * as A from "../../Array"
import type { Predicate } from "../../Function"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunks } from "./mapChunks"

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter<O>(f: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>): Stream<R, E, O> => filter_(self, f)
}

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter_<R, E, O>(
  self: Stream<R, E, O>,
  f: Predicate<O>
): Stream<R, E, O> {
  return pipe(self, mapChunks(A.filter(f)))
}
