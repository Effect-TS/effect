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
  KeyFor
} from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceWithKey<F extends URIS, C = Auto> extends Base<F> {
  readonly reduceWithKey: <N extends string, K, A, B>(
    b: B,
    f: (k: KeyFor<F, OrN<C, N>, OrK<C, K>>, b: B, a: A) => B
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
  ) => B
}
