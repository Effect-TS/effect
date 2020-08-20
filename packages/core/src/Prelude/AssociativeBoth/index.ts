import type { Auto, Base, Intro, Kind, Mix, OrFix, URIS } from "../HKT"

export interface AssociativeBoth<F extends URIS, C = Auto> extends Base<F, C> {
  readonly both: <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, B>(
    fb: Kind<
      F,
      OrFix<"N", C, N2>,
      OrFix<"K", C, K2>,
      SO,
      SO2,
      OrFix<"X", C, X2>,
      OrFix<"I", C, I2>,
      OrFix<"S", C, S2>,
      OrFix<"R", C, R2>,
      OrFix<"E", C, E2>,
      B
    >
  ) => <N extends string, K, SI, X, I, S, R, E, A>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, Intro<C, "X", X2, X>>,
      OrFix<"I", C, Intro<C, "I", I2, I>>,
      OrFix<"S", C, Intro<C, "S", S2, S>>,
      OrFix<"R", C, Intro<C, "R", R2, R>>,
      OrFix<"E", C, Intro<C, "E", E2, E>>,
      A
    >
  ) => Kind<
    F,
    OrFix<"N", C, N2>,
    OrFix<"K", C, K2>,
    SI,
    SO2,
    OrFix<"X", C, Mix<C, "X", [X2, X]>>,
    OrFix<"I", C, Mix<C, "I", [I2, I]>>,
    OrFix<"S", C, Mix<C, "S", [S2, S]>>,
    OrFix<"R", C, Mix<C, "R", [R2, R]>>,
    OrFix<"E", C, Mix<C, "E", [E2, E]>>,
    readonly [A, B]
  >
}
