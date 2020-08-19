import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"

export interface Invariant<F extends URIS, C = Auto> extends Base<F, C> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: Kind<
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
    g: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: Kind<
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
      A
    >
  }
}
