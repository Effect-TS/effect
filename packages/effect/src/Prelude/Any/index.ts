/**
 * @since 1.0.0
 */
import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"

/**
 * @since 1.0.0
 */
export interface Any<F extends URIS, C = Auto> extends Base<F> {
  readonly any: <S, SI, SO>() => Kind<
    F,
    OrN<C, any>,
    OrK<C, any>,
    SI,
    SO,
    OrX<C, any>,
    OrI<C, any>,
    OrS<C, S>,
    OrR<C, any>,
    OrE<C, any>,
    any
  >
}
