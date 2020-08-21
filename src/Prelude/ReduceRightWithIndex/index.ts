import type * as HKT from "../HKT"

export interface ReduceRightWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<F, C>
}

export interface ReduceRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A, b: B) => B
  ): <SI, SO, X, I, S, R, E>(fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>) => B
}
