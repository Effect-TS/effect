import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../HKT"

export interface Derive<F extends URIS, Typeclass extends URIS, C = Auto>
  extends Base<F> {
  readonly derive: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      Typeclass,
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
    Typeclass,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    Kind<
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
  >
}
