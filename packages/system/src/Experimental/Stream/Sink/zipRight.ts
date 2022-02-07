// ets_tracing: off

import type * as C from "./core.js"
import * as ZipWith from "./zipWith.js"

/**
 * Like `zip`, but keeps only the result from this sink.
 */
export function zipRight_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1 extends In,
  OutErr,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): C.Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z1> {
  return ZipWith.zipWith_(self, that, (_, z1) => z1)
}

/**
 * Like `zip`, but keeps only the result from this sink.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    zipRight_(self, that)
}
