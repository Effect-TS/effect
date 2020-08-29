import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT"

export interface Run<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly either: <A, N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, never, Either<HKT.OrFix<"E", C, E>, A>>
}
