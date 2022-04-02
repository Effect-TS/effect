// ets_tracing: off

import type { AssociativeCompose } from "../AssociativeCompose/index.js"
import type * as HKT from "../HKT/index.js"

export interface Category<F extends HKT.HKT> extends AssociativeCompose<F> {
  readonly id: <A, E = never>() => HKT.Kind<F, A, E, A>
}
