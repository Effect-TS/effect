import type * as HKT from "../../HKT"

export interface Fail<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly fail: <SI, SO, X, I, S, R, E, A = never>(
    e: HKT.AccessType<F, C, "E", X, I, S, R, E>
  ) => HKT.Kind<
    F,
    C,
    HKT.OrFix<"N", C, never>,
    HKT.OrFix<"K", C, never>,
    SI,
    SO,
    HKT.OrFix<"X", C, X>,
    HKT.OrFix<"I", C, I>,
    HKT.OrFix<"S", C, S>,
    HKT.OrFix<"R", C, R>,
    HKT.OrFix<"E", C, E>,
    A
  >
}
