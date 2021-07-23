// ets_tracing: off

import type { Predicate, Refinement } from "../../Function"
import type { Separated } from "../../Utils"
import type * as HKT from "../HKT"

export interface Partition<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Partition: "Partition"
  readonly partition: {
    <A, B extends A>(refinement: Refinement<A, B>): <K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => Separated<
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    >
    <A>(predicate: Predicate<A>): <K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => Separated<
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    >
  }
}
