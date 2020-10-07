import type { Either } from "../../Classic/Either"
import type { Separated } from "../../Utils"
import type * as HKT from "../HKT"

export interface PartitionMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly partitionMap: <A, B, B1>(
    f: (a: A) => Either<B, B1>
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B1>
  >
}
