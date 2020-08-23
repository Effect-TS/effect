import type * as HKT from "../HKT"

export interface Reduce<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => B
}
