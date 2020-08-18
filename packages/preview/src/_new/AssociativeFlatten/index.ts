import { Auto, Kind, Or, URIS } from "../HKT"

export interface AssociativeFlatten<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> {
  readonly flatten: <K, SI, SO, X, I, R, E, A, K2, SO2, X2, I2, S, R2, E2>(
    ffa: Kind<
      F,
      Or<FK, K2>,
      SI,
      SO,
      Or<FX, X2>,
      Or<FI, I2>,
      Or<FS, S>,
      Or<FR, R2>,
      Or<FE, E2>,
      Kind<
        F,
        Or<FK, K>,
        SO,
        SO2,
        Or<FX, X>,
        Or<FI, I>,
        Or<FS, S>,
        Or<FR, R>,
        Or<FE, E>,
        A
      >
    >
  ) => Kind<
    F,
    Or<FK, K2>,
    SI,
    SO2,
    Or<FX, X | X>,
    Or<FI, I & I2>,
    Or<FS, S>,
    Or<FR, R & R2>,
    Or<FE, E | E2>,
    A
  >
}
