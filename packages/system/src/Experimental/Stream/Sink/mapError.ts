// ets_tracing: off

import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Transforms the errors emitted by this sink using `f`.
 */
export function mapError_<R, InErr, In, OutErr, OutErr1, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (err: OutErr) => OutErr1
): C.Sink<R, InErr, In, OutErr1, L, Z> {
  return new C.Sink(CH.mapError_(self.channel, f))
}

/**
 * Transforms the errors emitted by this sink using `f`.
 *
 * @ets_data_first mapError_
 */
export function mapError<OutErr, OutErr1>(f: (err: OutErr) => OutErr1) {
  return <R, InErr, In, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    mapError_(self, f)
}
