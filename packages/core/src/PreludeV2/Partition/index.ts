// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Predicate, Refinement } from "../../Function/index.js"
import type * as HKT from "../HKT/index.js"

export interface Partition<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly partition: {
    <A, B extends A>(refinement: Refinement<A, B>): <X, I, R, E>(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, A>, HKT.Kind<F, X, I, R, E, B>]>
    <A>(predicate: Predicate<A>): <X, I, R, E>(
      fa: HKT.Kind<F, X, I, R, E, A>
    ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, A>, HKT.Kind<F, X, I, R, E, A>]>
  }
}
