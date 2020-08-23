import type * as HKT from "../HKT"

export interface CovariantWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly mapWithIndex: <N extends string, K, A, B>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => B
  ) => <SI, SO, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>
}
