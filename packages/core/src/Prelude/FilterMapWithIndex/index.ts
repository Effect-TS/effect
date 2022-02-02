// ets_tracing: off

import type { Option } from "../../Option/index.js"
import type * as HKT from "../HKT/index.js"

export interface FilterMapWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _FilterMapWithIndex: "FilterMapWithIndex"
  readonly filterMapWithIndex: <K, A, B>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, a: A) => Option<B>
  ) => <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}
