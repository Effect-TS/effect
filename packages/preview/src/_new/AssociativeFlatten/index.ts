import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base } from "../HKT"

export interface AssociativeFlatten<F extends URIS, C = Auto> extends Base<F> {
  readonly flatten: <K, SI, SO, X, I, R, E, A, K2, SO2, X2, I2, S, R2, E2>(
    ffa: Kind<
      F,
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
