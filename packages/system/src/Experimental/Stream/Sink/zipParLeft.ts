// ets_tracing: off

import type * as C from "./core.js"
import * as ZipWithPar from "./zipWithPar.js"

/**
 * Like `zipPar`, but keeps only the result from this sink.
 */
export function zipParLeft_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  L1,
  Z,
  Z1
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr | OutErr1, L | L1, Z> {
  return ZipWithPar.zipWithPar_(self, that, (b, _) => b)
}

/**
 * Like `zipPar`, but keeps only the result from this sink.
 *
 * @ets_data_first zipParLeft_
 */
export function zipParLeft<R1, InErr1, In1, OutErr1, L1, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    zipParLeft_(self, that)
}
