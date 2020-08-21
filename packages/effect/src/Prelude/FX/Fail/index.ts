import type * as HKT from "../../HKT"

export interface Fail<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly fail: <
    SI,
    SO,
    X = HKT.INIT<F, C, "X">,
    I = HKT.INIT<F, C, "I">,
    S = HKT.INIT<F, C, "S">,
    R = HKT.INIT<F, C, "R">,
    E = HKT.INIT<F, C, "E">
  >(
    e: HKT.AccessType<F, C, "E", X, I, S, R, E>
  ) => HKT.KindFix<F, C, never, never, SI, SO, X, I, S, R, E, never>
}
