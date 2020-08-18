import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base } from "../HKT"

export interface Derive<F extends URIS, Typeclass extends URIS, C = Auto> extends Base<F> {
  readonly derive: <K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      Typeclass,
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
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    Kind<F, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  >
}
