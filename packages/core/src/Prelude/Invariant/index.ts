import type * as HKT from "../HKT"

export interface Invariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>
    g: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>
    ) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  }
}
