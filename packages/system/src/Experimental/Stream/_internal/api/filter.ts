// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type { Predicate, Refinement } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as MapChunks from "./mapChunks.js"

/**
 * Filters the elements emitted by this stream using the provided function.
 */
export function filter_<R, E, A, B extends A>(
  self: C.Stream<R, E, A>,
  f: Refinement<A, B>
): C.Stream<R, E, B>
export function filter_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A>
export function filter_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A> {
  return MapChunks.mapChunks_(self, CK.filter(f))
}

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, B>
export function filter<A>(
  f: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A>
export function filter<A>(
  f: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A> {
  return <R, E>(self: C.Stream<R, E, A>) => filter_(self, f)
}
