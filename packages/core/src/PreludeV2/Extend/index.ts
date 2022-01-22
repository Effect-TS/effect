// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Extend<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly extend: <R, E, A, B>(
    f: (_: HKT.Kind<F, R, E, A>) => B
  ) => (fa: HKT.Kind<F, R, E, A>) => HKT.Kind<F, R, E, B>
}
