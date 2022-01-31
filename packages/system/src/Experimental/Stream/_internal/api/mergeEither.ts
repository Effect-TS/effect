// ets_tracing: off

import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as MergeWith from "./mergeWith.js"

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R1 & R, E | E1, E.Either<A, A1>> {
  return MergeWith.mergeWith(self, that, E.left, E.right)
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @ets_data_first mergeEither_
 */
export function mergeEither<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => mergeEither_(self, that)
}
