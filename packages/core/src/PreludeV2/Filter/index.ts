// ets_tracing: off

import type { Predicate, Refinement } from "../../Function"
import type * as HKT from "../HKT"

export interface Filter<F extends HKT.HKT> {
  readonly filter: {
    <A, B extends A>(refinement: Refinement<A, B>): <X, I, R, E>(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => HKT.Kind<F, X, I, R, E, B>
    <A>(predicate: Predicate<A>): <X, I, R, E>(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => HKT.Kind<F, X, I, R, E, A>
  }
}
