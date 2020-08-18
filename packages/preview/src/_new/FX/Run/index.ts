import { Either } from "../../../_system/Either"
import { Auto, Base, Kind, Or, URIS } from "../../HKT"

export interface Run<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> extends Base<F> {
  readonly run: <K, SI, SO, X, I, S, R, E, A>(
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
    Or<FE, never>,
    Either<Or<FE, E>, A>
  >
}
