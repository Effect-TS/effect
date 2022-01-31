// ets_tracing: off

import type * as HKT from "../../HKT/index.js"

export interface Access<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Access: "Access"
  readonly access: <A, R>(
    f: (_: R) => A
  ) => HKT.Kind<
    F,
    C,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    R,
    HKT.Initial<C, "E">,
    A
  >
}
