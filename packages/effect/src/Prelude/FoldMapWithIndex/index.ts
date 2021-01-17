import type { Identity } from "../../Identity"
import type * as HKT from "../HKT"

export interface FoldMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly foldMapWithIndex: FoldMapWithIndexFn<F, C>
}

export interface FoldMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(I: Identity<M>): <N extends string, K, A>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M
}
