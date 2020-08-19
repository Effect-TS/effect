import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../../HKT"

export interface Provide<F extends URIS, C = Auto> extends Base<F, C> {
  readonly provide: <R>(
    r: OrR<C, R>
  ) => <N extends string, K, SI, SO, X, I, S, E, A>(
    fa: Kind<
      F,
      OrN<C, N>,
      OrK<C, K>,
      SI,
      SO,
      OrX<C, X>,
      OrI<C, I>,
      OrS<C, S>,
      OrR<C, R>,
      OrE<C, E>,
      A
    >
  ) => Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, E>,
    A
  >
}
