// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple"
import type * as C from "./core"
import * as ZipWith from "./zipWith"

export function zip_<
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
): C.Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Tp.Tuple<[Z, Z1]>> {
  return ZipWith.zipWith_(self, that, (a, b) => Tp.tuple(a, b))
}

/**
 * @ets_data_first zip_
 */
export function zip<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    zip_(self, that)
}
