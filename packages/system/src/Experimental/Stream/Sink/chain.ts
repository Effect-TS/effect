// ets_tracing: off

import type * as C from "./core.js"
import * as FoldSink from "./foldSink.js"

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<
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
  f: (z: Z) => C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): C.Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z1> {
  return FoldSink.foldSink_(self, (_) => fail(_), f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 *
 * @ets_data_first chain_
 */
export function chain<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z, Z1>(
  f: (z: Z) => C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr>(self: C.Sink<R, InErr, In, OutErr, L, Z>) => chain_(self, f)
}
