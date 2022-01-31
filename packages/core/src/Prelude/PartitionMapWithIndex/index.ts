// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Either } from "../../Either/index.js"
import type * as HKT from "../HKT/index.js"

export interface PartitionMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _PartitionMapWithIndex: "PartitionMapWithIndex"
  readonly partitionMapWithIndex: <N extends string, K, A, B, B1>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, a: A) => Either<B, B1>
  ) => <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Tp.Tuple<
    [
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>
    ]
  >
}
