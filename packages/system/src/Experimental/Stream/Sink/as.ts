// ets_tracing: off

import type * as C from "./core.js"
import * as Map from "./map.js"

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, InErr, In, OutErr, L, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  z: Z1
): C.Sink<R, InErr, In, OutErr, L, Z1> {
  return Map.map_(self, (_) => z)
}

/**
 * Replaces this sink's result with the provided value.
 *
 * @ets_data_first as_
 */
export function as<Z1>(z: Z1) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    as_(self, z)
}
