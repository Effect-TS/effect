// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import type * as C from "./core.js"
import * as FoldEffect from "./foldEffect.js"
import * as Map from "./map.js"

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like `foldWeightedM`, but with a constant cost function of 1.
 */
export function foldUntilEffect<Env, In, Err, S>(
  z: S,
  max: number,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): C.Sink<Env, Err, In, Err, In, S> {
  return pipe(
    FoldEffect.foldEffect<Env, Err, In, Tp.Tuple<[S, number]>>(
      Tp.tuple(z, 0),
      ({ tuple: [_, a] }) => a < max,
      ({ tuple: [o, count] }, i) => T.map_(f(o, i), (_) => Tp.tuple(_, count + 1))
    ),
    Map.map(Tp.get(0))
  )
}
