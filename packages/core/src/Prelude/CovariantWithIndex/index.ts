import {
  Auto,
  Base,
  IndexFor,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  URIS
} from "../HKT"

export interface CovariantWithIndex<F extends URIS, C = Auto> extends Base<F> {
  readonly mapWithIndex: <N extends string, K, A, B>(
    f: (k: IndexFor<F, OrN<C, N>, OrK<C, K>>, a: A) => B
  ) => <SI, SO, X, I, S, R, E>(
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
