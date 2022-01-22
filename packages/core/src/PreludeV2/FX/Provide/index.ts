// ets_tracing: off

import type * as HKT from "../../HKT/index.js"

export interface Provide<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly provide: <R>(
    r: R
  ) => <X, I, E, A>(fa: HKT.Kind<F, R, E, A>) => HKT.Kind<F, unknown, E, A>
}
