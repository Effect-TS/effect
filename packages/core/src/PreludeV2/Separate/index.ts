// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as Tp from "../../Collections/Immutable/Tuple"
import type * as HKT from "../HKT"

export interface Separate<F extends HKT.HKT> {
  readonly separate: <X, I, R, E, A, B>(
    fa: HKT.Kind<F, X, I, R, E, Either<A, B>>
  ) => Tp.Tuple<[HKT.Kind<F, X, I, R, E, A>, HKT.Kind<F, X, I, R, E, B>]>
}
