import { Kind, URIS, Or, Auto, Base } from "../HKT"

export interface None<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> extends Base<F> {
  readonly never: <S, SI, SO = SI>() => Kind<
    F,
    Or<FK, never>,
    SI,
    SO,
    Or<FX, never>,
    Or<FI, unknown>,
    Or<FS, S>,
    Or<FR, unknown>,
    Or<FE, never>,
    never
  >
}
