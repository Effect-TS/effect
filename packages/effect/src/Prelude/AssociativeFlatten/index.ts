/**
 * @since 1.0.0
 */
import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../HKT"

/**
 * @since 1.0.0
 */
export interface AssociativeFlatten<F extends URIS, C = Auto> extends Base<F> {
  readonly flatten: <
    N extends string,
    K,
    SI,
    SO,
    X,
    I,
    R,
    E,
    A,
    N2 extends string,
    K2,
    SO2,
    X2,
    I2,
    S,
    R2,
    E2
  >(
    ffa: Kind<
      F,
      OrN<C, N2>,
      OrK<C, K2>,
      SI,
      SO,
      OrX<C, X2>,
      OrI<C, I2>,
      OrS<C, S>,
      OrR<C, R2>,
      OrE<C, E2>,
      Kind<
        F,
        OrN<C, N>,
        OrK<C, K>,
        SO,
        SO2,
        OrX<C, X>,
        OrI<C, I>,
        OrS<C, S>,
        OrR<C, R>,
        OrE<C, E>,
        A
      >
    >
  ) => Kind<
    F,
    OrN<C, N2>,
    OrK<C, K2>,
    SI,
    SO2,
    OrX<C, X | X2>,
    OrI<C, I & I2>,
    OrS<C, S>,
    OrR<C, R & R2>,
    OrE<C, E | E2>,
    A
  >
}
