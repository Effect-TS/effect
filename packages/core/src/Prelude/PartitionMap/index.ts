// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Either } from "../../Either/index.js"
import type * as HKT from "../HKT/index.js"

export interface PartitionMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _PartitionMap: "PartitionMap"
  readonly partitionMap: <A, B, B1>(
    f: (a: A) => Either<B, B1>
  ) => <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Tp.Tuple<
    [
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>
    ]
  >
}
