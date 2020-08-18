import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base } from "../HKT"

export interface None<F extends URIS, C = Auto> extends Base<F> {
  readonly never: <S, SI, SO = SI>() => Kind<
    F,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, never>,
    never
  >
}
