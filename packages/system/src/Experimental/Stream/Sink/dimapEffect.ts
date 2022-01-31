// ets_tracing: off

import type * as T from "../../../Effect/index.js"
import * as ContramapEffect from "./contramapEffect.js"
import type * as C from "./core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapEffect_<
  R,
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  Z,
  Z1
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => T.Effect<R1, InErr1, In>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
): C.Sink<R1 & R & R2, InErr & InErr1, In1, OutErr | OutErr1, L, Z1> {
  return MapEffect.mapEffect_(ContramapEffect.contramapEffect_(self, f), g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 *
 * @ets_data_first dimapEffect_
 */
export function dimapEffect<
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr1,
  Z,
  Z1
>(f: (in_: In1) => T.Effect<R1, InErr1, In>, g: (z: Z) => T.Effect<R2, OutErr1, Z1>) {
  return <R, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    dimapEffect_(self, f, g)
}
