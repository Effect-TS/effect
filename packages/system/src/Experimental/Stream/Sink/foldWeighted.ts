// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as C from "./core.js"
import * as FoldWeightedDecompose from "./foldWeightedDecompose.js"

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See `foldWeightedDecompose`
 * for a variant that can handle these cases.
 */
export function foldWeighted<Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => number,
  max: number,
  f: (s: S, in_: In) => S
): C.Sink<unknown, Err, In, Err, In, S> {
  return FoldWeightedDecompose.foldWeightedDecompose<Err, In, S>(
    z,
    costFn,
    max,
    (_) => CK.single(_),
    f
  )
}
