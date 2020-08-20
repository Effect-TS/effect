import { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface AssociativeBoth<F extends URIS, C = Auto> extends Base<F, C> {
  readonly both: <N2 extends string, K2, SO, SO2, X2, I2, S, R2, E2, B>(
    fb: Kind<
      F,
      OrFix<"N", C, N2>,
      OrFix<"K", C, K2>,
      SO,
      SO2,
      OrFix<"X", C, X2>,
      OrFix<"I", C, I2>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R2>,
      OrFix<"E", C, E2>,
      B
    >
  ) => <N extends string, K, SI, X, I, R, E, A>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, X>,
      OrFix<"X", C, I>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R>,
      OrFix<"E", C, E>,
      A
    >
  ) => Kind<
    F,
    OrFix<"N", C, N2>,
    OrFix<"K", C, K2>,
    SI,
    SO2,
    OrFix<"X", C, X | X2>,
    OrFix<"I", C, I & I2>,
    OrFix<"S", C, S>,
    OrFix<"I", C, R & R2>,
    OrFix<"E", C, E | E2>,
    readonly [A, B]
  >
}
