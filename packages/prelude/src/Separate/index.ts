import type * as HKT from "@effect-ts/hkt"
import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

export interface Separate<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Separate: "Separate"
  readonly separate: <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<A, B>>
  ) => Separated<
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
  >
}
