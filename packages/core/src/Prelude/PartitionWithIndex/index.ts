import type { PredicateWithIndex, RefinementWithIndex, Separated } from "../../Utils"
import type * as HKT from "../HKT"

export interface PartitionWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly partitionWithIndex: {
    <N extends string, K, A, B extends A>(
      refinement: RefinementWithIndex<
        HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
        A,
        B
      >
    ): <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    ) => Separated<
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
    >
    <N extends string, K, A>(
      predicate: PredicateWithIndex<
        HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
        A
      >
    ): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    ) => Separated<
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    >
  }
}
