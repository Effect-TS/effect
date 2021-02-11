import type * as HKT from "@effect-ts/hkt"
import type { Predicate, Refinement } from "@effect-ts/system/Function"

export interface Filter<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Filter: "Filter"
  readonly filter: {
    <A, B extends A>(refinement: Refinement<A, B>): <
      N extends string,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E
    >(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
    <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  }
}
