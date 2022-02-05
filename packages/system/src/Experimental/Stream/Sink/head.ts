// ets_tracing: off

import * as O from "../../../Option/index.js"
import type * as C from "./core.js"
import * as Fold from "./fold.js"

/**
 * Creates a sink containing the first value.
 */
export function head<Err, In>(): C.Sink<unknown, Err, In, Err, In, O.Option<In>> {
  return Fold.fold<Err, In, O.Option<In>>(O.none, O.isNone, (s, in_) =>
    O.fold_(
      s,
      () => O.some(in_),
      (_) => s
    )
  )
}
