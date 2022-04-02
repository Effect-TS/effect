// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface ReduceRight<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <R, E>(fa: HKT.Kind<F, R, E, A>) => B
}
