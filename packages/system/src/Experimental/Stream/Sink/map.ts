// ets_tracing: off

import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Transforms this sink's result.
 */
export function map_<R, InErr, In, OutErr, L, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Z1
): C.Sink<R, InErr, In, OutErr, L, Z1> {
  return new C.Sink(CH.map_(self.channel, f))
}

/**
 * Transforms this sink's result.
 *
 * @ets_data_first map_
 */
export function map<Z, Z1>(f: (z: Z) => Z1) {
  return <R, InErr, In, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    map_(self, f)
}
