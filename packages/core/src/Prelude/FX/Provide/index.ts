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
    HKT.SetType<F, C, "X", X, "R", unknown>,
    HKT.SetType<F, C, "I", I, "R", unknown>,
    HKT.SetType<F, C, "S", S, "R", unknown>,
    HKT.SetType<F, C, "R", R, "R", unknown>,
    HKT.SetType<F, C, "E", E, "R", unknown>,
    A
  >
}
