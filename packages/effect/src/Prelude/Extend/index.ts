import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"

export interface Extend<F extends URIS, C = Auto> extends Base<F, C> {
  readonly extend: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(
    f: (
      _: Kind<
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
    ) => B
  ) => (
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
    OrR<C, R>,
    OrE<C, E>,
    B
  >
}
