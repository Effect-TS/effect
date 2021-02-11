import type * as HKT from "@effect-ts/hkt"
import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

export interface PartitionMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _PartitionMapWithIndex: "PartitionMapWithIndex"
  readonly partitionMapWithIndex: <N extends string, K, A, B, B1>(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      a: A
    ) => Either<B, B1>
  ) => <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B1>
  >
}
