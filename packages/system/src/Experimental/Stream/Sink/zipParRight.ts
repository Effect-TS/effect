// ets_tracing: off

import type * as C from "./core.js"
import * as ZipWithPar from "./zipWithPar.js"

/**
 * Like `zipPar`, but keeps only the result from `that` sink.
 */
export function zipParRight_<
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
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr | OutErr1, L | L1, Z1> {
  return ZipWithPar.zipWithPar_(self, that, (_, c) => c)
}

/**
 * Like `zipPar`, but keeps only the result from `that` sink.
 *
 * @ets_data_first zipParRight_
 */
export function zipParRight<R1, InErr1, In1, OutErr1, L1, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    zipParRight_(self, that)
}
