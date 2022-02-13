// ets_tracing: off

import type * as HKT from "../../HKT"

export interface Access<F extends HKT.HKT> {
  readonly access: <A, R>(f: (_: R) => A) => HKT.Kind<F, any, unknown, R, never, A>
}
