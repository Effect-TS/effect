import { Auto, Base, Kind, Or, URIS } from "../../HKT"

export interface Fail<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> extends Base<F> {
  readonly fail: <SI, SO, S, E, A = never>(
    e: Or<FE, E>
  ) => Kind<
    F,
    Or<FK, never>,
    SI,
    SO,
    Or<FX, never>,
    Or<FI, unknown>,
    Or<FS, S>,
    Or<FR, unknown>,
    Or<FE, E>,
    A
  >
}
