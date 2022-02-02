// ets_tracing: off

import type * as C from "./core.js"
import * as DropLeftover from "./dropLeftover.js"
import * as Fold from "./fold.js"

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function foldLeft<Err, In, S>(
  z: S,
  f: (s: S, in_: In) => S
): C.Sink<unknown, Err, In, Err, unknown, S> {
  return DropLeftover.dropLeftover(Fold.fold<Err, In, S>(z, (_) => true, f))
}
