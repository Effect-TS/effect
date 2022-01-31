// ets_tracing: off

import * as Contramap from "./contramap.js"
import type * as C from "./core.js"
import * as Map from "./map.js"

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap_<R, InErr, In, In1, OutErr, L, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => In,
  g: (z: Z) => Z1
): C.Sink<R, InErr, In1, OutErr, L, Z1> {
  return Map.map_(Contramap.contramap_(self, f), g)
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<In, In1, Z, Z1>(f: (in_: In1) => In, g: (z: Z) => Z1) {
  return <R, InErr, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    dimap_(self, f, g)
}
