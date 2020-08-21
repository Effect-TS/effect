import type * as HKT from "../../HKT"

export interface Fail<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly fail: <
    SI,
    SO,
    X = HKT.Initial<C, HKT.Alias<F, "X">>,
    I = HKT.Initial<C, HKT.Alias<F, "I">>,
    S = HKT.Initial<C, HKT.Alias<F, "S">>,
    R = HKT.Initial<C, HKT.Alias<F, "R">>,
    E = HKT.Initial<C, HKT.Alias<F, "E">>,
    A = never
  >(
    e: HKT.AccessType<F, C, "E", X, I, S, R, E>
  ) => HKT.KindFix<F, C, never, never, SI, SO, X, I, S, R, E, A>
}
