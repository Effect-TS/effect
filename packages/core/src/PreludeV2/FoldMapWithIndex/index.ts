// ets_tracing: off

import type { Identity } from "../../Identity"
import type * as HKT from "../HKT"

export interface FoldMapWithIndex<K, F extends HKT.HKT> {
  readonly foldMapWithIndex: FoldMapWithIndexFn<K, F>
}

export interface FoldMapWithIndexFn<K, F extends HKT.HKT> {
  <M>(I: Identity<M>): <A>(
    f: (k: K, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => M
}
