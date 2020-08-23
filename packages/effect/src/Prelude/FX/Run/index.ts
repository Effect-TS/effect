import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT"

export interface Run<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly either: <
    N extends string,
    K,
    SI,
    SO,
    A,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >(
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, never, Either<HKT.OrFix<"E", C, E>, A>>
}
