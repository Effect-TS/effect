import type { Either } from "../../Classic/Either"
import type { Option } from "../../Classic/Option"
import type { PredicateWithIndex, RefinementWithIndex, Separated } from "../../Utils"
import type * as HKT from "../HKT"

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> {
  readonly filterWithIndex: FilterWithIndex<F, C>
  readonly partitionWithIndex: PartitionWithIndex<F, C>
  readonly filterMapWithIndex: FilterMapWithIndex<F, C>
  readonly partitionMapWithIndex: PartitionMapWithIndex<F, C>
}

export interface FilterWithIndex<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<
      HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      A,
      B
    >
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, A>(
    predicate: PredicateWithIndex<
      HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      A
    >
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface PartitionWithIndex<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<
      HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      A,
      B
    >
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  >
  <N extends string, K, A>(
    predicate: PredicateWithIndex<
      HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      A
    >
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
  >
}

export interface PartitionMapWithIndex<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B, B1>(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      a: A
    ) => Either<B, B1>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>
  >
}

export interface FilterMapWithIndex<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      a: A
    ) => Option<B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}
