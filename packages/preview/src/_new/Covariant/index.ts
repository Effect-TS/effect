import { Kind, URIS, Or, Auto } from "../HKT"

export interface Covariant<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, SI, SO, X, I, S, R, E>(
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
    Or<FK, K>,
    SI,
    SO,
    Or<FX, X>,
    Or<FI, I>,
    Or<FS, S>,
    Or<FR, R>,
    Or<FE, E>,
    B
  >
}
