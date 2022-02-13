// ets_tracing: off

import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils"
import type * as HKT from "../HKT"

export interface FilterWithIndex<K, F extends HKT.HKT> {
  readonly filterWithIndex: {
    <N extends string, K, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): <
      X,
      I,
      R,
      E
    >(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => HKT.Kind<F, X, I, R, E, B>
    <K, A>(predicate: PredicateWithIndex<K, A>): <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => HKT.Kind<F, X, I, R, E, A>
  }
}
