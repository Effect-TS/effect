// ets_tracing: off

import type { Predicate, Refinement } from "../../Function/index.js"
import type * as HKT from "../HKT/index.js"

export interface Filter<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Filter: "Filter"
  readonly filter: {
    <A, B extends A>(refinement: Refinement<A, B>): <K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    <A>(predicate: Predicate<A>): <K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  }
}
