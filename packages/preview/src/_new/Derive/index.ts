import { Auto, Kind, Or, URIS } from "../HKT"

export interface Derive<
  F extends URIS,
  Typeclass extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto,
  TK = Auto,
  TX = Auto,
  TI = Auto,
  TS = Auto,
  TR = Auto,
  TE = Auto
> {
  readonly derive: <K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      Typeclass,
      Or<TK, K>,
      SI,
      SO,
      Or<TX, X>,
      Or<TI, I>,
      Or<TS, S>,
      Or<TR, R>,
      Or<TE, E>,
      A
    >
  ) => Kind<
    Typeclass,
    Or<TK, K>,
    SI,
    SO,
    Or<TX, X>,
    Or<TI, I>,
    Or<TS, S>,
    Or<TR, R>,
    Or<TE, E>,
    Kind<F, Or<FK, K>, SI, SO, Or<FX, X>, Or<FI, I>, Or<FS, S>, Or<FR, R>, Or<FE, E>, A>
  >
}
