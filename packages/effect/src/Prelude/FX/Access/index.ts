import type * as HKT from "../../HKT"

export interface Access<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly access: <A, SI, SO, X, I, S, R, E>(
    f: (_: HKT.AccessType<F, C, "R", X, I, S, R, E>) => A
  ) => HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, never>,
    HKT.OrFix<"K", C, never>,
    SI,
    SO,
    HKT.OrFix<"X", C, S>,
    HKT.OrFix<"I", C, I>,
    HKT.OrFix<"S", C, S>,
    HKT.OrFix<"R", C, R>,
    HKT.OrFix<"E", C, E>,
    A
  >
}
