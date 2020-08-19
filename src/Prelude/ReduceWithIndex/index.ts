import {
  URIS,
  Auto,
  Base,
  Kind,
  OrN,
  OrK,
  OrX,
  OrI,
  OrS,
  OrR,
  OrE,
  IndexFor
} from "../HKT"

export interface ReduceWithIndex<F extends URIS, C = Auto> extends Base<F> {
  readonly reduceWithIndex: ReduceWithIndexFn<F, C>
}

export interface ReduceWithIndexFn<F extends URIS, C = Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: IndexFor<F, OrN<C, N>, OrK<C, K>>, b: B, a: A) => B
  ): <SI, SO, X, I, S, R, E>(
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
  ) => B
}
