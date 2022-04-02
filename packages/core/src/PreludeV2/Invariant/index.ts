// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Invariant<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <R, E>(ma: HKT.Kind<F, R, E, A>) => HKT.Kind<F, R, E, B>
    g: <R, E>(ma: HKT.Kind<F, R, E, B>) => HKT.Kind<F, R, E, A>
  }
}
