import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT"

export interface Run<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly run: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: HKT.Kind<
      F,
      C,
      HKT.OrFix<"N", C, N>,
      HKT.OrFix<"K", C, K>,
      SI,
      SO,
      HKT.OrFix<"X", C, X>,
      HKT.OrFix<"I", C, I>,
      HKT.OrFix<"S", C, S>,
      HKT.OrFix<"R", C, R>,
      HKT.OrFix<"E", C, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, N>,
    HKT.OrFix<"K", C, K>,
    SI,
    SO,
    HKT.SetType<F, C, "X", X, "E", never>,
    HKT.SetType<F, C, "I", I, "E", never>,
    HKT.SetType<F, C, "S", S, "E", never>,
    HKT.SetType<F, C, "R", R, "E", never>,
    HKT.SetType<F, C, "E", E, "E", never>,
    Either<HKT.AccessType<F, C, "E", X, I, S, R, E>, A>
  >
}
