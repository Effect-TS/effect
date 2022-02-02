// ets_tracing: off

import type { Option } from "@effect-ts/system/Option"

import type * as HKT from "../HKT/index.js"

export interface Compact<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Compact: "Compact"
  readonly compact: <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}
