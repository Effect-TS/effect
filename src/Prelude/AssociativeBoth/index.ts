import type * as HKT from "../HKT"

export interface AssociativeBoth<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly both: <N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, B>(
    fb: HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ) => <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, "N", N2, N>,
      HKT.Intro<C, "K", K2, K>,
      HKT.Intro<C, "Q", Q2, Q>,
      HKT.Intro<C, "W", W2, W>,
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
    HKT.Infer<F, C, "N", typeof fa | typeof fb>,
    HKT.Infer<F, C, "K", typeof fa | typeof fb>,
    HKT.Infer<F, C, "Q", typeof fa | typeof fb>,
    HKT.Infer<F, C, "W", typeof fa | typeof fb>,
    HKT.Infer<F, C, "X", typeof fa | typeof fb>,
    HKT.Infer<F, C, "I", typeof fa | typeof fb>,
    HKT.Infer<F, C, "S", typeof fa | typeof fb>,
    HKT.Infer<F, C, "R", typeof fa | typeof fb>,
    HKT.Infer<F, C, "E", typeof fa | typeof fb>,
    readonly [A, B]
  >
}
