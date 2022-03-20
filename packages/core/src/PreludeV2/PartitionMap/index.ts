// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Either } from "../../Either/index.js"
import type * as HKT from "../HKT/index.js"

export interface PartitionMap<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly _PartitionMap: "PartitionMap"
  readonly partitionMap: <A, B, B1>(
    f: (a: A) => Either<B, B1>
  ) => <X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, B>, HKT.Kind<F, X, I, R, E, B1>]>
}
