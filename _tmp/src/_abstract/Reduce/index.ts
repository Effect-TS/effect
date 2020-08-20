import type { HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}
