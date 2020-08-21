import type * as HKT from "../HKT"

export interface Any<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly any: <
    N extends string,
    K,
    SI,
    SO,
    X = HKT.INIT<F, C, "X">,
    I = HKT.INIT<F, C, "I">,
    S = HKT.INIT<F, C, "S">,
    R = HKT.INIT<F, C, "R">,
    E = HKT.INIT<F, C, "E">
  >() => HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, any>
}
