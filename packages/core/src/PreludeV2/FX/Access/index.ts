// ets_tracing: off

import type * as HKT from "../../HKT/index.js"

export interface Access<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly access: <A, R>(f: (_: R) => A) => HKT.Kind<F, R, never, A>
}
