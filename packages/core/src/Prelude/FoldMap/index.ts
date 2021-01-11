import type { Identity } from "../../Common/Identity"
import type * as HKT from "../HKT"

export interface FoldMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly foldMap: FoldMapFn<F, C>
}

export interface FoldMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(I: Identity<M>): <A>(
    f: (a: A) => M
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => M
}
