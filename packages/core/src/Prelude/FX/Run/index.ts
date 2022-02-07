// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT/index.js"

export interface Run<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Run: "Run"
  readonly either: <A, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, never, Either<HKT.OrFix<"E", C, E>, A>>
}
