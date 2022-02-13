// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Extend<F extends HKT.HKT> {
  readonly extend: <X, I, R, E, A, B>(
    f: (_: HKT.Kind<F, X, I, R, E, A>) => B
  ) => (fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, R, E, B>
}
