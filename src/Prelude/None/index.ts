/**
 * @since 1.0.0
 */
import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../HKT"

/**
 * @since 1.0.0
 */
export interface None<F extends URIS, C = Auto> extends Base<F> {
  readonly never: <S, SI, SO = SI>() => Kind<
    F,
    OrN<C, never>,
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
