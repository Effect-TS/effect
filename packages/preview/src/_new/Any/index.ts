import { Auto, Kind, Or, URIS } from "../HKT"

export interface Any<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> {
  readonly any: <S, SI, SO = SI>() => Kind<
    F,
    Or<FK, never>,
    SI,
    SO,
    Or<FX, never>,
    Or<FI, unknown>,
    Or<FS, S>,
    Or<FR, unknown>,
    Or<FE, never>,
    unknown
  >
}
