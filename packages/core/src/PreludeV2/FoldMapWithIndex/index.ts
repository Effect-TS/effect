// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type * as HKT from "../HKT/index.js"

export interface FoldMapWithIndex<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly foldMapWithIndex: FoldMapWithIndexFn<K, F>
}

export interface FoldMapWithIndexFn<K, F extends HKT.HKT> {
  <M>(I: Identity<M>): <A>(
    f: (k: K, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => M
}
