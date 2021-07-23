// ets_tracing: off

import type { Either } from "../../Either"
import type { Separated } from "../../Utils"
import type * as HKT from "../HKT"

export interface PartitionMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _PartitionMapWithIndex: "PartitionMapWithIndex"
  readonly partitionMapWithIndex: <N extends string, K, A, B, B1>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, a: A) => Either<B, B1>
  ) => <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>
  >
}
