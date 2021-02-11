import type * as HKT from "@effect-ts/hkt"
import type { Option } from "@effect-ts/system/Option"

export interface FilterMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _FilterMapWithIndex: "FilterMapWithIndex"
  readonly filterMapWithIndex: <N extends string, K, A, B>(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      a: A
    ) => Option<B>
  ) => <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}
