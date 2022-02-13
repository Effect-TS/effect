// ets_tracing: off

import type { AssociativeCompose } from "../AssociativeCompose"
import type * as HKT from "../HKT"

export interface Category<F extends HKT.HKT> extends AssociativeCompose<F> {
  readonly id: <A, X = any, R = unknown, E = never>() => HKT.Kind<F, X, A, R, E, A>
}
