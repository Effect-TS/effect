// ets_tracing: off

import type * as HKT from "../HKT"

export interface Reduce<F extends HKT.HKT> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => B
}
