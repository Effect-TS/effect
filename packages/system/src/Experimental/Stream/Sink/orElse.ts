// ets_tracing: off

import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function orElse_<
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
): C.Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L, Z | Z1> {
  return new C.Sink(CH.orElse_(self.channel, that.channel))
}

/**
 * @ets_data_first orElse_
 */
export function orElse<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    orElse_(self, that)
}
