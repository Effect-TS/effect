// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils/index.js"
import type * as HKT from "../HKT/index.js"

export interface PartitionWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, A, B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Tp.Tuple<
    [
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    ]
  >
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, A>): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Tp.Tuple<
    [
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ]
  >
}

export interface PartitionWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _PartitionWithIndex: "PartitionWithIndex"
  readonly partitionWithIndex: PartitionWithIndexFn<F, C>
}
