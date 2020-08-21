import type * as HKT from "../HKT"

export interface AssociativeBoth<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly both: <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, B>(
    fb: HKT.KindFix<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, B>
  ) => <N extends string, K, SI, X, I, S, R, E, A>(
    fa: HKT.Kind<
      F,
      C,
      N,
      K,
      SI,
      SO,
      HKT.Intro<C, "X", X2, X>,
      HKT.Intro<C, "I", I2, I>,
      HKT.Intro<C, "S", S2, S>,
      HKT.Intro<C, "R", R2, R>,
      HKT.Intro<C, "E", E2, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    N2,
    K2,
    SI,
    SO2,
    HKT.Mix<C, "X", [X2, X]>,
    HKT.Mix<C, "I", [I2, I]>,
    HKT.Mix<C, "S", [S2, S]>,
    HKT.Mix<C, "R", [R2, R]>,
    HKT.Mix<C, "E", [E2, E]>,
    readonly [A, B]
  >
}
