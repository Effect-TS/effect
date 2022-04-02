// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils/index.js"
import type * as HKT from "../HKT/index.js"

export interface PartitionWithIndexFn<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  <N extends string, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): <R, E>(
    fa: HKT.Kind<F, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, R, E, A>, HKT.Kind<F, R, E, B>]>
  <A>(predicate: PredicateWithIndex<K, A>): <X, I, R, E>(
    fa: HKT.Kind<F, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, R, E, A>, HKT.Kind<F, R, E, A>]>
}

export interface PartitionWithIndex<K, F extends HKT.HKT> {
  readonly partitionWithIndex: PartitionWithIndexFn<K, F>
}
