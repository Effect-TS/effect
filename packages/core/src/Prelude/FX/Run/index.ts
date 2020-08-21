import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT"

export interface Run<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly run: <
    N extends string,
    K,
    SI,
    SO,
    A,
    X = HKT.INIT<F, C, "X">,
    I = HKT.INIT<F, C, "I">,
    S = HKT.INIT<F, C, "S">,
    R = HKT.INIT<F, C, "R">,
    E = HKT.INIT<F, C, "E">
  >(
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.KindFix<
    F,
    C,
    N,
    K,
    SI,
    SO,
    HKT.SetType<F, "X", X, "E", never>,
    HKT.SetType<F, "I", I, "E", never>,
    HKT.SetType<F, "S", S, "E", never>,
    HKT.SetType<F, "R", R, "E", never>,
    HKT.SetType<F, "E", E, "E", never>,
    Either<HKT.AccessType<F, C, "E", X, I, S, R, E>, A>
  >
}
