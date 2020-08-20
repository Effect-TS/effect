import { Auto, Kind, OrFix, URIS, Base } from "../HKT"

import { Either } from "@effect-ts/system/Either"

export interface AssociativeEither<F extends URIS, C = Auto> extends Base<F, C> {
  readonly either: <N2 extends string, K2, SI2, SO2, X2, I2, S, R2, E2, B>(
    fb: Kind<
      F,
      OrFix<"N", C, N2>,
      OrFix<"K", C, K2>,
      SI2,
      SO2,
      OrFix<"X", C, X2>,
      OrFix<"I", C, I2>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R2>,
      OrFix<"E", C, E2>,
      B
    >
  ) => <N extends string, K, SI, SO, X, I, R, E, A>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, X>,
      OrFix<"I", C, I>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R>,
      OrFix<"E", C, E>,
      A
    >
  ) => Kind<
    F,
    OrFix<"N", C, N | N2>,
    OrFix<"K", C, K | K2>,
    SI & SI2,
    SO | SO2,
    OrFix<"X", C, X | X2>,
    OrFix<"I", C, I & I2>,
    OrFix<"S", C, S>,
    OrFix<"R", C, R & R2>,
    OrFix<"E", C, E | E2>,
    Either<A, B>
  >
}
