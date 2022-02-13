// ets_tracing: off

import type * as HKT from "../../HKT"

export interface Provide<F extends HKT.HKT> {
  readonly provide: <R>(
    r: R
  ) => <X, I, E, A>(fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, unknown, E, A>
}
