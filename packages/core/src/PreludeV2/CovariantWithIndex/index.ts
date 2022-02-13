// ets_tracing: off

import type * as HKT from "../HKT"

export interface CovariantWithIndex<K, F extends HKT.HKT> {
  readonly mapWithIndex: <A, B>(
    f: (k: K, a: A) => B
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, R, E, B>
}
