import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

import type * as HKT from "../HKT"

export interface Separate<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly separate: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, Either<A, B>>
  ) => Separated<
    HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>,
    HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>
  >
}
