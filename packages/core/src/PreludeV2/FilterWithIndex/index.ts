// ets_tracing: off

import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils/index.js"
import type * as HKT from "../HKT/index.js"

export interface FilterWithIndex<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly filterWithIndex: {
    <N extends string, K, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): <
      R,
      E
    >(
      fa: HKT.Kind<F, R, E, A>
    ) => HKT.Kind<F, R, E, B>
    <K, A>(predicate: PredicateWithIndex<K, A>): <Q, W, S, R, E>(
      fa: HKT.Kind<F, R, E, A>
    ) => HKT.Kind<F, R, E, A>
  }
}
