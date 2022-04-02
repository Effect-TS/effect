// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type * as HKT from "../HKT/index.js"

export interface FoldMap<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly foldMap: FoldMapFn<F>
}

export interface FoldMapFn<F extends HKT.HKT> {
  <M>(I: Identity<M>): <A>(f: (a: A) => M) => <R, E>(fa: HKT.Kind<F, R, E, A>) => M
}
