import type * as HKT from "../HKT"

export interface ReduceWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly reduceWithIndex: ReduceWithIndexFn<F, C>
}

export interface ReduceWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, b: B, a: A) => B
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
}
