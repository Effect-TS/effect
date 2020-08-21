import type * as HKT from "../../HKT"

export interface Access<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly access: <
    A,
    SI,
    SO,
    X = HKT.INIT<F, C, "X">,
    I = HKT.INIT<F, C, "I">,
    S = HKT.INIT<F, C, "S">,
    R = HKT.INIT<F, C, "R">,
    E = HKT.INIT<F, C, "E">
  >(
    f: (_: HKT.AccessType<F, C, "R", X, I, S, R, E>) => A
  ) => HKT.KindFix<F, C, never, never, SI, SO, S, I, S, R, E, A>
}
