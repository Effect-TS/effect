import type { Option } from "@effect-ts/system/Option"

import type * as HKT from "../HKT"

export interface Compact<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly compact: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, Option<A>>
  ) => HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
}
