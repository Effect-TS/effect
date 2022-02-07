// ets_tracing: off

import type { PredicateWithIndex, RefinementWithIndex } from "../../Utils/index.js"
import type * as HKT from "../HKT/index.js"

export interface FilterWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _FilterWithIndex: "FilterWithIndex"
  readonly filterWithIndex: {
    <N extends string, K, A, B extends A>(
      refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, A, B>
    ): <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, A>): <
      Q,
      W,
      X,
      I,
      S,
      R,
      E
    >(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  }
}
