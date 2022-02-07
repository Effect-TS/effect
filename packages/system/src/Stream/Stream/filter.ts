// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Predicate, Refinement } from "../../Function/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter<O, O1 extends O>(
  f: Refinement<O, O1>
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1>
export function filter<O>(
  f: Predicate<O>
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O>
export function filter<O>(
  f: Predicate<O>
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O> {
  return <R, E>(self: Stream<R, E, O>): Stream<R, E, O> => filter_(self, f)
}

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter_<R, E, O, O1 extends O>(
  self: Stream<R, E, O>,
  f: Refinement<O, O1>
): Stream<R, E, O1>
export function filter_<R, E, O>(
  self: Stream<R, E, O>,
  f: Predicate<O>
): Stream<R, E, O>
export function filter_<R, E, O>(
  self: Stream<R, E, O>,
  f: Predicate<O>
): Stream<R, E, O> {
  return mapChunks_(self, A.filter(f))
}
