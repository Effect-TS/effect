// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type * as HKT from "../HKT/index.js"

export interface FoldMap<F extends HKT.HKT> {
  readonly foldMap: FoldMapFn<F>
}

export interface FoldMapFn<F extends HKT.HKT> {
  <M>(I: Identity<M>): <A>(
    f: (a: A) => M
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => M
}
