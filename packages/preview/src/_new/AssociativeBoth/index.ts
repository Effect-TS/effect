import { Auto, Kind, Or, URIS } from "../HKT"

export interface AssociativeBoth<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> {
  readonly both: <K2, SO, SO2, X2, I2, S, R2, E2, B>(
    fb: Kind<
      F,
      Or<FK, K2>,
      SO,
      SO2,
      Or<FX, X2>,
      Or<FI, I2>,
      Or<FS, S>,
      Or<FR, R2>,
      Or<FE, E2>,
      B
    >
  ) => <K, SI, X, I, R, E, A>(
    fa: Kind<
      F,
      Or<FK, K>,
      SI,
      SO,
      Or<FX, X>,
      Or<FI, I>,
      Or<FS, S>,
      Or<FR, R>,
      Or<FE, E>,
      A
    >
  ) => Kind<
    F,
    Or<FK, K2>,
    SI,
    SO2,
    Or<FX, X | X2>,
    Or<FI, I & I2>,
    Or<FS, S>,
    Or<FR, R & R2>,
    Or<FE, E | E2>,
    readonly [A, B]
  >
}
