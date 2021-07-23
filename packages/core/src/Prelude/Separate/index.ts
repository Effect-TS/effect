// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

import type * as HKT from "../HKT"

export interface Separate<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Separate: "Separate"
  readonly separate: <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
  ) => Separated<
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  >
}
