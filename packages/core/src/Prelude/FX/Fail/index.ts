// ets_tracing: off

import type * as HKT from "../../HKT/index.js"

export interface Fail<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Fail: "Fail"
  readonly fail: <E = HKT.Initial<C, "E">>(
    e: E
  ) => HKT.Kind<
    F,
    C,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    E,
    never
  >
}
