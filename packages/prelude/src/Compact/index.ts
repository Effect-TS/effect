import type * as HKT from "@effect-ts/hkt"
import type { Option } from "@effect-ts/system/Option"

export interface Compact<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Compact: "Compact"
  readonly compact: <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Option<A>>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}
