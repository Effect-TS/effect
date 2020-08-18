import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base } from "../HKT"

export interface Covariant<F extends URIS, C = Auto> extends Base<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
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
