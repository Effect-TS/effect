// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Derive<F extends HKT.HKT, G extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly derive: <R, E, A>(
    fa: HKT.Kind<G, R, E, A>
  ) => HKT.Kind<G, R, E, HKT.Kind<F, R, E, A>>
}
