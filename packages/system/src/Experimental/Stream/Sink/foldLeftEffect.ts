// ets_tracing: off

import type * as T from "../../../Effect/index.js"
import type * as C from "./core.js"
import * as FoldEffect from "./foldEffect.js"

/**
 * A sink that effectfully folds its inputs with the provided function and initial state.
 */
export function foldLeftEffect<R, Err, In, S>(
  z: S,
  f: (s: S, in_: In) => T.Effect<R, Err, S>
): C.Sink<R, Err, In, Err, In, S> {
  return FoldEffect.foldEffect<R, Err, In, S>(z, (_) => true, f)
}
