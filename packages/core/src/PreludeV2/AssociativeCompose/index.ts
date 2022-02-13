// ets_tracing: off

import type * as HKT from "../HKT"

export interface AssociativeCompose<F extends HKT.HKT> {
  readonly compose: <B, C, X = any, R = unknown, E = never>(
    bc: HKT.Kind<F, X, B, R, E, C>
  ) => <A, X2 = any, S2 = any, R2 = unknown, E2 = never>(
    ab: HKT.Kind<F, X2, A, R & R2, E | E2, B>
  ) => HKT.Kind<F, X2, A, R & R2, E | E2, C>
}
