// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils"
import type * as HKT from "../HKT"

export interface PartitionWithIndexFn<K, F extends HKT.HKT> {
  <N extends string, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): <
    X,
    I,
    R,
    E
  >(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, A>, HKT.Kind<F, X, I, R, E, B>]>
  <A>(predicate: PredicateWithIndex<K, A>): <X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, A>, HKT.Kind<F, X, I, R, E, A>]>
}

export interface PartitionWithIndex<K, F extends HKT.HKT> {
  readonly partitionWithIndex: PartitionWithIndexFn<K, F>
}
