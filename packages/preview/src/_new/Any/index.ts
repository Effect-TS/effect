import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS } from "../HKT"

export interface Any<F extends URIS, C = Auto> {
  readonly any: <S, SI, SO>() => Kind<
    F,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, never>,
    unknown
  >
}
