import type * as HKT from "../../HKT"

export interface Provide<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly provide: <
    X = HKT.Initial<C, HKT.Alias<F, "X">>,
    I = HKT.Initial<C, HKT.Alias<F, "I">>,
    S = HKT.Initial<C, HKT.Alias<F, "S">>,
    R = HKT.Initial<C, HKT.Alias<F, "R">>,
    E = HKT.Initial<C, HKT.Alias<F, "E">>
  >(
    r: HKT.AccessType<F, C, "R", X, I, S, R, E>
  ) => <N extends string, K, SI, SO, A>(
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.KindFix<
    F,
    C,
    N,
    K,
    SI,
    SO,
    HKT.SetType<F, "X", X, "R", unknown>,
    HKT.SetType<F, "I", I, "R", unknown>,
    HKT.SetType<F, "S", S, "R", unknown>,
    HKT.SetType<F, "R", R, "R", unknown>,
    HKT.SetType<F, "E", E, "R", unknown>,
    A
  >
}
