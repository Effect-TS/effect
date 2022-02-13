// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import type { Either } from "../../Either"
import type * as HKT from "../HKT"

export interface PartitionMapWithIndex<K, F extends HKT.HKT> {
  readonly partitionMapWithIndex: <N extends string, A, B, B1>(
    f: (k: K, a: A) => Either<B, B1>
  ) => <X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, B>, HKT.Kind<F, X, I, R, E, B1>]>
}
