// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Derive<F extends HKT.HKT, G extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly derive: <X, I, R, E, A>(
    fa: HKT.Kind<G, X, I, R, E, A>
  ) => HKT.Kind<G, X, I, R, E, HKT.Kind<F, X, I, R, E, A>>
}
