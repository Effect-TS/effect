// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import type { Either } from "../../Either"
import type * as HKT from "../HKT"

export interface PartitionMap<F extends HKT.HKT> {
  readonly _PartitionMap: "PartitionMap"
  readonly partitionMap: <A, B, B1>(
    f: (a: A) => Either<B, B1>
  ) => <X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, B>, HKT.Kind<F, X, I, R, E, B1>]>
}
