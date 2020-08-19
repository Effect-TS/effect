import { URIS, Auto, Base, Kind, OrN, OrK, OrX, OrI, OrS, OrR, OrE } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface Reduce<F extends URIS, C = Auto> extends Base<F> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
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
