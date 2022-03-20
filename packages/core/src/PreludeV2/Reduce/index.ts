// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Reduce<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => B
}
