import type { Identity } from "../../Classic/Identity"
import type * as HKT from "../HKT"

export interface FoldMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly foldMap: FoldMapFn<F, C>
}

export interface FoldMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(I: Identity<M>): <A>(
    f: (a: A) => M
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => M
}
