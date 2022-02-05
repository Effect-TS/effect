// ets_tracing: off

import type { Option } from "../../Option/index.js"
import type * as HKT from "../HKT/index.js"

export interface FilterMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _FilterMap: "FilterMap"
  readonly filterMap: <A, B>(
    f: (a: A) => Option<B>
  ) => <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}
