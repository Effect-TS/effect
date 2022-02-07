// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import type * as C from "./core.js"
import * as Fold from "./fold.js"
import * as Map from "./map.js"

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 */
export function foldUntil<Err, In, S>(
  z: S,
  max: number,
  f: (s: S, in_: In) => S
): C.Sink<unknown, Err, In, Err, In, S> {
  return Map.map_(
    Fold.fold<Err, In, Tp.Tuple<[S, number]>>(
      Tp.tuple(z, 0),
      (_) => Tp.get_(_, 1) < max,
      ({ tuple: [o, count] }, i) => Tp.tuple(f(o, i), count + 1)
    ),
    Tp.get(0)
  )
}
