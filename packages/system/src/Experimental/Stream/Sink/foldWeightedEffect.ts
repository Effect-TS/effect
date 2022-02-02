// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import type * as C from "./core.js"
import * as FoldWeightedDecomposeEffect from "./foldWeightedDecomposeEffect.js"

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See `foldWeightedDecomposeM`
 * for a variant that can handle these cases.
 */
export function foldWeightedEffect<Env, Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => T.Effect<Env, Err, number>,
  max: number,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): C.Sink<Env, Err, In, Err, In, S> {
  return FoldWeightedDecomposeEffect.foldWeightedDecomposeEffect(
    z,
    costFn,
    max,
    (i) => T.succeed(CK.single(i)),
    f
  )
}
