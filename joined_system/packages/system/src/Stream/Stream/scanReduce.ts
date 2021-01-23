import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { scanReduceM_ } from "./scanReduceM"

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 */
export function scanReduce_<R, E, O, O1 extends O>(
  self: Stream<R, E, O>,
  f: (o1: O1, o: O) => O1
): Stream<R, E, O1> {
  return scanReduceM_(self, (curr, next) => T.succeed(f(curr, next)))
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 */
export function scanReduce<O, O1 extends O>(f: (o1: O1, o: O) => O1) {
  return <R, E>(self: Stream<R, E, O>) => scanReduce_(self, f)
}
