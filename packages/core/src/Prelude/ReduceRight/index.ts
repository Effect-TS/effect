import type * as HKT from "../HKT"

export interface ReduceRight<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => B
}
